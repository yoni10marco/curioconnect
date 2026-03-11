import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const QUEUE_TARGET = 25;

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      removed_interests,
      added_interests,
      all_interests,
      difficulty_level,
      difficulty_changed,
    } = await req.json();

    const difficulty = difficulty_level ?? "adult";
    let deletedCount = 0;
    let generatedCount = 0;

    // --- Step 1: Handle deletions ---

    if (difficulty_changed) {
      // Full purge — difficulty changed, regenerate everything
      const { data: deleted } = await adminSupabase
        .from("lesson_queue")
        .delete()
        .eq("user_id", user.id)
        .select("id");
      deletedCount = deleted?.length ?? 0;
    } else if (
      Array.isArray(removed_interests) &&
      removed_interests.length > 0
    ) {
      // Delete only lessons for removed interests
      const { data: deleted } = await adminSupabase
        .from("lesson_queue")
        .delete()
        .eq("user_id", user.id)
        .in("interest_name", removed_interests)
        .select("id");
      deletedCount = deleted?.length ?? 0;
    }

    // --- Step 2: Count remaining and determine how many to generate ---

    const { count: remainingCount } = await adminSupabase
      .from("lesson_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const remaining = remainingCount ?? 0;
    const toGenerate = Math.max(0, QUEUE_TARGET - remaining);

    if (toGenerate === 0) {
      return new Response(
        JSON.stringify({ deleted: deletedCount, generated: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 3: Fetch topics for pairing ---

    const interests: string[] = all_interests ?? [];
    if (interests.length === 0) {
      return new Response(
        JSON.stringify({ deleted: deletedCount, generated: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: allTopics } = await adminSupabase
      .from("topics")
      .select("name");
    const topicNames: string[] = (allTopics ?? []).map(
      (t: { name: string }) => t.name
    );

    if (topicNames.length === 0) {
      return new Response(
        JSON.stringify({
          deleted: deletedCount,
          generated: 0,
          error: "No topics found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 4: Build lesson pairs (round-robin interests × random topics) ---

    const lessonPairs: { topic_name: string; interest_name: string }[] = [];
    for (let i = 0; i < toGenerate; i++) {
      const interest = interests[i % interests.length];
      const topic = topicNames[Math.floor(Math.random() * topicNames.length)];
      lessonPairs.push({ topic_name: topic, interest_name: interest });
    }

    // --- Step 5: Single Gemini call to generate all lessons ---

    const pairsList = lessonPairs
      .map(
        (p, i) =>
          `${i + 1}. Topic: "${p.topic_name}", Interest: "${p.interest_name}"`
      )
      .join("\n");

    const geminiPrompt = `You are an expert lesson generator for a gamified learning app called CurioConnect (like Duolingo, but for everything).

Generate exactly ${lessonPairs.length} short educational lessons based on the topic+interest pairs below.
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

Return ONLY a valid JSON array of ${lessonPairs.length} lesson objects. No markdown fences, no explanation — just the JSON array.`;

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
      throw new Error(`Gemini API error ${geminiResponse.status}: ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    const generatedLessons = JSON.parse(rawText);

    if (!Array.isArray(generatedLessons)) {
      throw new Error("Gemini did not return an array");
    }

    // Get current max queue_position
    const { data: maxPosRow } = await adminSupabase
      .from("lesson_queue")
      .select("queue_position")
      .eq("user_id", user.id)
      .order("queue_position", { ascending: false })
      .limit(1)
      .single();

    let nextPosition = (maxPosRow?.queue_position ?? -1) + 1;

    const rows = generatedLessons
      .filter(
        (l: any) =>
          l.title && l.content_markdown && l.quiz_data
      )
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
        throw insertError;
      }
    }

    generatedCount = rows.length;

    return new Response(
      JSON.stringify({
        deleted: deletedCount,
        generated: generatedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("sync-lesson-queue error:", error);
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
