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

    const { feedbackSummaries, resourceType, uiLanguage } = await req.json();
    if (!feedbackSummaries || !Array.isArray(feedbackSummaries) || feedbackSummaries.length === 0) {
      throw new Error("feedbackSummaries is required");
    }

    const langMap: Record<string, string> = {
      "zh-TW": "繁體中文",
      "zh-CN": "简体中文",
      "en": "English",
    };
    const lang = langMap[uiLanguage] || "English";

    const typeMap: Record<string, string> = {
      exercise: `a 15-minute classroom exercise/worksheet targeting the weaknesses identified below. Include:
- Clear learning objectives
- 3-5 practice questions with varying difficulty
- An answer key
- Brief teacher notes on common misconceptions`,
      vocabulary: `a "commonly confused words/phrases" study note targeting the errors found below. Include:
- Each error pattern with correct vs incorrect usage
- Example sentences for each
- A mini self-test at the end`,
      lessonPlan: `a complete 40-minute lesson plan addressing the weaknesses found below. Include:
- Warm-up activity (5 min)
- Main teaching points with examples (20 min)
- Student practice activity (10 min)
- Wrap-up and assessment (5 min)
- Differentiation suggestions for weaker and stronger students`,
    };

    const resourceDesc = typeMap[resourceType] || typeMap.exercise;

    const systemPrompt = `You are an experienced secondary school teacher creating teaching resources. Write ENTIRELY in ${lang}. Create well-structured, ready-to-use materials.`;

    const userPrompt = `Based on the following common errors and weaknesses from recent student essays, generate ${resourceDesc}

Common errors/weaknesses found:
${feedbackSummaries.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Make it practical, engaging, and immediately usable in the classroom.`;

    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
    let resource = "";

    async function callAIForResource(): Promise<string> {
      if (AI_PROVIDER === "deepseek") {
        const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
        if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");
        const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("DeepSeek API error:", resp.status, errText);
          if (resp.status === 429) throw new Error("Rate limited. Please try again shortly.");
          throw new Error("Resource generation failed");
        }
        const data = await resp.json();
        return data.choices?.[0]?.message?.content ?? "";
      } else {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("AI error:", resp.status, errText);
          if (resp.status === 429) throw new Error("Rate limited. Please try again shortly.");
          if (resp.status === 402) throw new Error("AI credits exhausted.");
          throw new Error("Resource generation failed");
        }
        const data = await resp.json();
        return data.choices?.[0]?.message?.content ?? "";
      }
    }

    resource = await callAIForResource();

    return new Response(JSON.stringify({ resource }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-teaching-resource error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
