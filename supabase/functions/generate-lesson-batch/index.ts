import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const QUEUE_TARGET = 25;
const CHUNK_SIZE = 5; // lessons per Gemini call to avoid timeout

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("generate-lesson-batch: started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await adminSupabase.auth.getUser(token);
    if (authError || !user) {
      console.log("generate-lesson-batch: auth failed", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lessons, difficulty_level } = await req.json();

    if (!Array.isArray(lessons) || lessons.length === 0) {
      return new Response(
        JSON.stringify({ error: "lessons array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cap at QUEUE_TARGET to prevent abuse
    const lessonPairs = lessons.slice(0, QUEUE_TARGET);
    const difficulty = difficulty_level ?? "adult";

    console.log(`generate-lesson-batch: generating ${lessonPairs.length} lessons in chunks of ${CHUNK_SIZE}`);

    // Get current max queue_position for this user
    const { data: maxPosRow } = await adminSupabase
      .from("lesson_queue")
      .select("queue_position")
      .eq("user_id", user.id)
      .order("queue_position", { ascending: false })
      .limit(1)
      .single();

    let nextPosition = (maxPosRow?.queue_position ?? -1) + 1;
    let totalGenerated = 0;
    let totalFailed = 0;

    // Process in chunks to avoid Gemini/Edge Function timeout
    for (let i = 0; i < lessonPairs.length; i += CHUNK_SIZE) {
      const chunk = lessonPairs.slice(i, i + CHUNK_SIZE);

      const pairsList = chunk
        .map(
          (p: { topic_name: string; interest_name: string }, idx: number) =>
            `${idx + 1}. Topic: "${p.topic_name}", Interest: "${p.interest_name}"`
        )
        .join("\n");

      const geminiPrompt = `You are an expert lesson generator for a gamified learning app called CurioConnect (like Duolingo, but for everything).

Generate exactly ${chunk.length} short educational lessons based on the topic+interest pairs below.
Difficulty level: "${difficulty}" (adjust vocabulary and depth accordingly — "child" = simple & fun, "teen" = engaging & clear, "adult" = detailed & insightful).

Each lesson should creatively connect the academic topic with the user's personal interest to make learning engaging and relatable.

Pairs:
${pairsList}

For EACH lesson, produce:
- "topic_name": the exact topic name from the pair
- "interest_name": the exact interest name from the pair
- "title": a catchy, short lesson title (max 60 chars)
- "content_markdown": educational content in markdown (~400-600 words). Use headers (##), bold, bullet points, and examples. Make it fun and connect the topic to the interest naturally.
- "quiz_data": an array with exactly 1 object: { "text": "" (empty string), "questions": [ array of 3 quiz questions ] }. Each question: { "q": "question text", "options": ["A","B","C","D"], "answer_idx": 0-3 }

Return ONLY a valid JSON array of ${chunk.length} lesson objects. No markdown fences, no explanation — just the JSON array.`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          console.error(`generate-lesson-batch: Gemini error chunk ${i / CHUNK_SIZE + 1}: ${geminiResponse.status} ${errText}`);
          totalFailed += chunk.length;
          continue;
        }

        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.error(`generate-lesson-batch: empty Gemini response for chunk ${i / CHUNK_SIZE + 1}`);
          totalFailed += chunk.length;
          continue;
        }

        const generatedLessons = JSON.parse(rawText);

        if (!Array.isArray(generatedLessons)) {
          console.error(`generate-lesson-batch: Gemini returned non-array for chunk ${i / CHUNK_SIZE + 1}`);
          totalFailed += chunk.length;
          continue;
        }

        // Build rows for batch insert
        const rows = generatedLessons
          .filter((l: any) => l.title && l.content_markdown && l.quiz_data)
          .map((l: any) => ({
            user_id: user.id,
            topic_name: l.topic_name ?? "General",
            interest_name: l.interest_name ?? "general knowledge",
            title: l.title,
            content_markdown: l.content_markdown,
            quiz_data: l.quiz_data,
            queue_position: nextPosition++,
          }));

        if (rows.length > 0) {
          const { error: insertError } = await adminSupabase
            .from("lesson_queue")
            .insert(rows);

          if (insertError) {
            console.error(`generate-lesson-batch: DB insert error chunk ${i / CHUNK_SIZE + 1}:`, insertError.message);
            totalFailed += chunk.length;
            continue;
          }
        }

        totalGenerated += rows.length;
        totalFailed += chunk.length - rows.length;
        console.log(`generate-lesson-batch: chunk ${i / CHUNK_SIZE + 1} done, ${rows.length} lessons inserted`);
      } catch (chunkErr) {
        console.error(`generate-lesson-batch: chunk ${i / CHUNK_SIZE + 1} failed:`, String(chunkErr));
        totalFailed += chunk.length;
      }
    }

    console.log(`generate-lesson-batch: complete. generated=${totalGenerated}, failed=${totalFailed}`);

    return new Response(
      JSON.stringify({
        generated: totalGenerated,
        failed: totalFailed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-lesson-batch error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json",
      },
    });
  }
});
