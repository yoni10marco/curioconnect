import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single Gemini call: moderation + interest discovery
    const geminiPrompt = `You are a content moderator and interest analyzer for a learning app for all ages (children, teens, and adults).

First, check if the following user text is appropriate for all ages (reject violence, adult content, hate speech, self-harm, or any inappropriate topics).

Then, if it is safe, extract and suggest 3 to 7 specific personal interests or hobbies the user seems to have based on their description. Be creative and specific — suggest interests they may not have thought of themselves. Format each interest as a relevant emoji followed by a short name (2-3 words max), for example: "🎻 Violin", "🧗 Rock Climbing", "🐠 Marine Biology", "🧩 Puzzle Solving".

User text: "${prompt.trim().replace(/"/g, '\\"')}"

Return ONLY valid JSON in this exact format:
{ "safe": boolean, "interests": string[] }

If the text is not safe, return: { "safe": false, "interests": [] }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(rawText);

    if (!parsed.safe) {
      return new Response(JSON.stringify({ error: "inappropriate_content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discoveredInterests: string[] = parsed.interests ?? [];

    if (discoveredInterests.length === 0) {
      return new Response(JSON.stringify({ added: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's existing interests to deduplicate
    const { data: existingData } = await adminSupabase
      .from("user_interests")
      .select("interest_name")
      .eq("user_id", user.id);

    const existingSet = new Set(
      (existingData ?? []).map((r: { interest_name: string }) => r.interest_name.toLowerCase())
    );

    const newInterests = discoveredInterests.filter(
      (interest) => !existingSet.has(interest.toLowerCase())
    );

    if (newInterests.length === 0) {
      return new Response(JSON.stringify({ added: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert new interests
    const rows = newInterests.map((interest_name) => ({
      user_id: user.id,
      interest_name,
    }));

    const { error: insertError } = await adminSupabase.from("user_interests").insert(rows);

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ added: newInterests }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("discover-interests error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
