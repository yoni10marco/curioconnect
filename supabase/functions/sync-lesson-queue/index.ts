import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const QUEUE_TARGET = 25;
const CHUNK_SIZE = 5;

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
    console.log("sync-lesson-queue: started");

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
      console.log("sync-lesson-queue: auth failed", authError?.message);
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
      const { data: deleted } = await adminSupabase
        .from("lesson_queue")
        .delete()
        .eq("user_id", user.id)
        .select("id");
      deletedCount = deleted?.length ?? 0;
      console.log(`sync-lesson-queue: purged ${deletedCount} lessons (difficulty changed)`);
    } else if (
      Array.isArray(removed_interests) &&
      removed_interests.length > 0
    ) {
      const { data: deleted } = await adminSupabase
        .from("lesson_queue")
        .delete()
        .eq("user_id", user.id)
        .in("interest_name", removed_interests)
        .select("id");
      deletedCount = deleted?.length ?? 0;
      console.log(`sync-lesson-queue: deleted ${deletedCount} lessons for removed interests`);
    }

    // --- Step 2: Count remaining and determine how many to generate ---

    const { count: remainingCount } = await adminSupabase
      .from("lesson_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const remaining = remainingCount ?? 0;
    const toGenerate = Math.max(0, QUEUE_TARGET - remaining);

    if (toGenerate === 0) {
      console.log("sync-lesson-queue: queue already at target, nothing to generate");
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
        JSON.stringify({ deleted: deletedCount, generated: 0, error: "No topics found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 4: Build lesson pairs ---

    const lessonPairs: { topic_name: string; interest_name: string }[] = [];
    for (let i = 0; i < toGenerate; i++) {
      const interest = interests[i % interests.length];
      const topic = topicNames[Math.floor(Math.random() * topicNames.length)];
      lessonPairs.push({ topic_name: topic, interest_name: interest });
    }

    console.log(`sync-lesson-queue: generating ${lessonPairs.length} lessons in chunks of ${CHUNK_SIZE}`);

    // --- Step 5: Generate in chunks ---

    // Get current max queue_position
    const { data: maxPosRow } = await adminSupabase
      .from("lesson_queue")
      .select("queue_position")
      .eq("user_id", user.id)
      .order("queue_position", { ascending: false })
      .limit(1)
      .single();

    let nextPosition = (maxPosRow?.queue_position ?? -1) + 1;

    for (let i = 0; i < lessonPairs.length; i += CHUNK_SIZE) {
      const chunk = lessonPairs.slice(i, i + CHUNK_SIZE);

      const pairsList = chunk
        .map(
          (p, idx) =>
            `${idx + 1}. Topic: "${p.topic_name}", Interest: "${p.interest_name}"`
        )
        .join("\n");

      const geminiPrompt = `You are CurioConnect, an educational AI that teaches academic topics through the lens of personal hobbies.

Generate exactly ${chunk.length} personalized lessons based on the topic+interest pairs below.
Difficulty level: "${difficulty}" (adjust vocabulary and depth accordingly — "child" = simple & fun, "beginner" = engaging & clear, "intermediate" = detailed, "advanced" = insightful & deep).

Each lesson should creatively connect the academic topic with the user's personal interest to make learning engaging and relatable.

Pairs:
${pairsList}

CRITICAL INSTRUCTIONS for EACH lesson:
1. Split the lesson into 4 to 6 pages.
2. The text for each page MUST BE VERY SHORT. Use an absolute maximum of 1 or 2 short paragraphs per page. Do not write long walls of text. Be concise and punchy.
3. After each page's text, generate exactly 2 quiz questions based ONLY on that page's text.
4. You MUST randomize the 'answer_idx' (0, 1, 2, or 3) for the correct answer so it is not always the same option!

For EACH lesson, produce:
- "topic_name": the exact topic name from the pair
- "interest_name": the exact interest name from the pair
- "title": a catchy, short lesson title (max 60 chars)
- "pages": an array of 4-6 page objects, each: { "text": "Short markdown text for this page", "questions": [{"q": "Question", "options": ["A","B","C","D"], "answer_idx": 0-3}, {"q": "Question 2", "options": ["A","B","C","D"], "answer_idx": 0-3}] }

Return ONLY a valid JSON array of ${chunk.length} lesson objects. No markdown fences, no explanation — just the JSON array.`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${geminiKey}`;
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
          console.error(`sync-lesson-queue: Gemini error chunk ${i / CHUNK_SIZE + 1}: ${geminiResponse.status} ${errText}`);
          continue;
        }

        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.error(`sync-lesson-queue: empty Gemini response for chunk ${i / CHUNK_SIZE + 1}`);
          continue;
        }

        const generatedLessons = JSON.parse(rawText);

        if (!Array.isArray(generatedLessons)) {
          console.error(`sync-lesson-queue: non-array response for chunk ${i / CHUNK_SIZE + 1}`);
          continue;
        }

        const rows = generatedLessons
          .filter((l: any) => l.title && l.pages && l.pages.length > 0)
          .map((l: any) => ({
            user_id: user.id,
            topic_name: l.topic_name ?? "General",
            interest_name: l.interest_name ?? "general knowledge",
            title: l.title,
            content_markdown: "",
            quiz_data: l.pages,
            queue_position: nextPosition++,
          }));

        if (rows.length > 0) {
          const { error: insertError } = await adminSupabase
            .from("lesson_queue")
            .insert(rows);

          if (insertError) {
            console.error(`sync-lesson-queue: DB insert error chunk ${i / CHUNK_SIZE + 1}:`, insertError.message);
            continue;
          }
        }

        generatedCount += rows.length;
        console.log(`sync-lesson-queue: chunk ${i / CHUNK_SIZE + 1} done, ${rows.length} lessons inserted`);
      } catch (chunkErr) {
        console.error(`sync-lesson-queue: chunk ${i / CHUNK_SIZE + 1} failed:`, String(chunkErr));
      }
    }

    console.log(`sync-lesson-queue: complete. deleted=${deletedCount}, generated=${generatedCount}`);

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
