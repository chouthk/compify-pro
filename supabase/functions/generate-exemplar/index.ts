import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { topic, genre, gradeLevel, examType, wordCount, uiLanguage } = await req.json();
    if (!topic || !genre) throw new Error("topic and genre are required");

    const langMap: Record<string, string> = {
      "zh-TW": "繁體中文",
      "zh-CN": "简体中文",
      "en": "English",
    };
    const lang = langMap[uiLanguage] || "English";
    const wc = wordCount || 600;

    const systemPrompt = `You are an expert essay writing teacher. Write ENTIRELY in ${lang}. Generate high-quality model essays that serve as exemplars for students.`;

    const userPrompt = `Write a model essay with the following requirements:

Topic: ${topic}
Genre/Style: ${genre}
${gradeLevel ? `Grade Level: ${gradeLevel}` : ""}
${examType ? `Exam Type: ${examType}` : ""}
Target Word Count: approximately ${wc} words

Requirements:
1. Write a complete, polished essay that demonstrates excellent writing skills
2. Use appropriate vocabulary and sentence structures for the specified level
3. Show clear organization with introduction, body paragraphs, and conclusion
4. Include strong thesis, supporting evidence, and rhetorical techniques appropriate to the genre
5. The essay should score in the top range (A/A+) for the specified exam type

Format the output as:
# [Essay Title]

[Full essay text]

---

## 寫作技巧分析 / Writing Techniques Analysis

[Brief analysis of key writing techniques used, suitable for teacher reference]`;

    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
    let content = "";

    if (AI_PROVIDER === "deepseek") {
      const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
      if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");
      const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          stream: false,
        }),
      });
      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("DeepSeek API error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Exemplar generation failed");
      }
      const aiData = await aiResponse.json();
      content = aiData.choices?.[0]?.message?.content ?? "";
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Exemplar generation failed");
      }
      const aiData = await aiResponse.json();
      content = aiData.choices?.[0]?.message?.content ?? "";
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exemplar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
