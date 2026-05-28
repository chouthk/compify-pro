import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LONG_ESSAY_CHAR_LIMIT = 9000;
const CHUNK_CHAR_LIMIT = 5200;

function splitEssayIntoChunks(content: string, limit = CHUNK_CHAR_LIMIT): string[] {
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length ? paragraphs : [content]) {
    if (paragraph.length > limit) {
      if (current.trim()) chunks.push(current.trim());
      for (let i = 0; i < paragraph.length; i += limit) chunks.push(paragraph.slice(i, i + limit).trim());
      current = "";
    } else if ((current + "\n\n" + paragraph).length > limit) {
      if (current.trim()) chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.slice(0, 8);
}

/**
 * AI provider abstraction.
 * Supports:
 *  - "lovable": Lovable Gateway (legacy, uses LOVABLE_API_KEY + model name)
 *  - "deepseek": DeepSeek API (uses DEEPSEEK_API_KEY, model = "deepseek-chat")
 * 
 * Set AI_PROVIDER env var to "deepseek" or "lovable" (default: lovable for bc).
 */

const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const DEEPSEEK_MODEL = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

async function callAI(apiKey: string, model: string, messages: { role: string; content: string }[], maxTokens = 4096) {
  if (AI_PROVIDER === "deepseek") {
    return await callDeepSeek(messages, maxTokens);
  }
  // Fallback: Lovable Gateway
  return await callLovable(apiKey, model, messages, maxTokens);
}

async function callDeepSeek(messages: { role: string; content: string }[], maxTokens = 4096) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured. Set it in Supabase Edge Function secrets.");
  }
  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("DeepSeek API error:", response.status, errText);
    const error = new Error(response.status === 429 ? "Rate limited by AI provider. Please try again shortly." : "AI grading failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callLovable(apiKey: string, model: string, messages: { role: string; content: string }[], maxTokens = 4096) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Lovable AI error:", response.status, errText);
    const error = new Error(response.status === 429 ? "Rate limited. Please try again shortly." : response.status === 402 ? "AI credits exhausted." : "AI grading failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

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

    const { essayId, uiLanguage, rubric, rubricPreset, studentLevel, examinerMode, mode } = await req.json();
    if (!essayId) throw new Error("essayId is required");

    // Map preset keys to exam context with official marking standards
    const presetContext: Record<string, string> = {
      dse_chinese: "HKDSE Chinese Language (中國語文) Writing Paper (卷二). Official HKEAA marking criteria: 內容(40分)/表達(30分)/結構(20分)/標點字體(10分), total 103 marks including 錯別字扣分(最多3分). Use the 品第 system (上品/中品/下品) for grading",
      dse_english: "HKDSE English Language Writing Paper 2. Official HKEAA descriptors: Content (7 marks), Language & Style (7 marks), Organization (7 marks), total 21 marks. Grade using 5 levels (Level 5 = excellent, Level 1 = poor)",
      ib: "IB Diploma Programme English A: Language & Literature (Paper 1 & Paper 2). Official IB assessment criteria: Criterion A – Understanding & Interpretation (5 marks), Criterion B – Analysis & Evaluation (5 marks), Criterion C – Focus & Organization (5 marks), Criterion D – Language (5 marks), total 20 marks",
      ielts: "IELTS Academic Writing Task 2. Official British Council/IDP/Cambridge band descriptors: Task Response (Band 1-9), Coherence & Cohesion (Band 1-9), Lexical Resource (Band 1-9), Grammatical Range & Accuracy (Band 1-9). Average of four criteria = overall band score",
      toefl: "TOEFL iBT Writing Section (ETS). Official rubric scored 0-5: evaluates Development & Support, Organization, and Language Use. Score 5 = well organized with appropriate detail; Score 1 = serious disorganization or underdevelopment",
    };
    const examContext = rubricPreset && presetContext[rubricPreset] ? presetContext[rubricPreset] : null;

    // Validate rubric if provided
    const validRubric = Array.isArray(rubric) ? rubric.filter((c: any) =>
      typeof c.name === "string" && c.name.trim() &&
      typeof c.weight === "number" && c.weight > 0
    ).slice(0, 10) : null;

    // Fetch the essay
    const { data: essay, error: fetchError } = await supabase
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !essay) throw new Error("Essay not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Determine feedback language
    const langMap: Record<string, string> = {
      "zh-TW": "繁體中文 (Traditional Chinese)",
      "zh-CN": "简体中文 (Simplified Chinese)",
      "en": "English",
    };
    const feedbackLangHint = uiLanguage && langMap[uiLanguage] ? langMap[uiLanguage] : null;

    // Build rubric section for prompt
    let rubricPrompt = "";
    if (validRubric && validRubric.length > 0) {
      const examLine = examContext ? `\nEXAM STANDARD: Grade this essay according to the **${examContext}** marking standards and expectations. Apply the scoring rigor and conventions of this specific examination.\n` : "";
      rubricPrompt = `${examLine}
GRADING RUBRIC (use these criteria and weights for scoring):
${validRubric.map((c: any) => `- **${c.name}** (${c.weight}%): ${c.description || "No description"}`).join("\n")}

IMPORTANT: The final score MUST be a weighted average based on the rubric above. For each criterion, assign a sub-score out of 100, then compute the weighted total. Show the breakdown in your response like:
### Rubric Breakdown
| Criterion | Weight | Sub-Score | Weighted |
|-----------|--------|-----------|----------|
${validRubric.map((c: any) => `| ${c.name} | ${c.weight}% | [X]/100 | [Y] |`).join("\n")}
| **Total** | **100%** | | **[Final Score]/100** |`;
    }

    const defaultAnalysis = validRubric ? "" : `
## Detailed Analysis

### Thesis & Argument Structure
Evaluate the clarity of the thesis statement, logical flow of arguments, and whether conclusions follow from the evidence presented.

### Evidence & Support
Assess whether claims are backed by evidence, examples, or citations. Note any unsupported assertions.

### Language & Mechanics
Analyze grammar, spelling, punctuation, sentence variety, and vocabulary usage. List specific errors found with corrections.

### Organization & Coherence
Evaluate paragraph structure, transitions, and overall essay flow.

### Style & Voice
Comment on tone appropriateness, word choice sophistication, and engagement level for the target audience.`;

    // Tiered feedback based on student level
    let tieredFeedbackInstructions = "";
    if (studentLevel === "weak") {
      tieredFeedbackInstructions = `
STUDENT LEVEL: This student is a weaker writer. Adjust your feedback:
- Use encouraging, supportive language. Start with genuine praise before corrections.
- Focus on 2-3 BASIC issues (grammar, spelling, simple sentence structure). Don't overwhelm.
- Provide very specific, step-by-step corrections the student can immediately apply.
- Use simpler vocabulary in your feedback.
- Add motivational closing remarks.`;
    } else if (studentLevel === "strong") {
      tieredFeedbackInstructions = `
STUDENT LEVEL: This student is an advanced writer. Adjust your feedback:
- Provide sophisticated, nuanced analysis of rhetoric, argumentation, and style.
- Focus on higher-order concerns: logical rigor, persuasive techniques, structural sophistication.
- Challenge the student with advanced suggestions (e.g., parallelism, chiasmus, counterargument anticipation).
- Reference literary or rhetorical concepts where appropriate.
- Be more demanding in scoring — hold to a higher standard.`;
    }
    // "average" or unset = default behavior, no extra instructions

    const hongKongLanguageRules = `
HONG KONG EDUCATION BUREAU WRITTEN CHINESE STANDARD:
- When responding in Chinese, use formal Hong Kong written Chinese suitable for school reports and teacher comments.
- Do NOT use Mainland Chinese wording, Simplified Chinese terms, or literal translation tone. Avoid terms such as: 反馈、优化、打造、赋能、亮点、落实到位、语句不通顺、病句、卷面.
- Prefer Hong Kong school usage, e.g. 回饋、改善、建立、支援、優點、具體實行、句子欠通順、語病、文章表達.
- Keep wording natural, professional, concise, and aligned with Hong Kong secondary-school assessment practice.
- For Chinese essay feedback, use a professional, rigorous tone with literary judgement and cultural sensitivity. Avoid overly modern, promotional, casual, or Westernized phrasing.`;

    const chineseRhetoricInstructions = `
CHINESE ESSAY RHETORICAL DEVICE DETECTION:
- If the essay is written in Chinese, you MUST add a dedicated section titled "## 修辭手法偵測".
- Identify rhetorical devices actually used by the student, such as 排比、比喻、擬人、對比、襯托、反問、設問、借代、引用、反覆、誇張、象徵.
- For each detected device, quote the student's original wording, name the technique, explain its literary effect, and assess whether it strengthens the essay's 立意、情感、描寫 or 論證.
- If a device is attempted but weak, state this tactfully and explain how to refine it.
- Include a short "優化建議" subsection with 2-4 concrete improvements, using refined Hong Kong written Chinese and avoiding Mainland or stiff translated wording.
- Do NOT invent rhetorical devices that are not present in the essay.`;

    const examinerModeInstructions = examinerMode ? `
EXAMINER MODE ENABLED:
- You MUST explicitly cite DSE Marking Scheme keywords in comments where relevant.
- For English writing, use terms such as Content, Language, Organization, relevance, elaboration, range and accuracy, cohesion, coherence, task fulfilment, register, tone, and communicative effect.
- For Chinese writing, use terms such as 內容、立意、選材、鋪排、結構、層次、表達、語境意識、扣題、詳略、文句、修辭.
- Each major judgement must connect the student's actual writing to at least one marking keyword.` : "";

    const upgradeAdvicePrompt = `You are helping a Hong Kong teacher generate upgrade advice after an essay has already been graded.
${hongKongLanguageRules}
${examinerModeInstructions}
${chineseRhetoricInstructions}

Task: Compare the student's current essay against a Level 5** benchmark response. Do NOT invent a full model essay. Identify the practical gap between the current writing and Level 5** quality.

Return this exact structure in the essay language:

## Level 5** Gap Analysis
- 4-6 bullet points comparing the current essay with Level 5** expectations. Quote or refer to the student's actual wording.

## Priority Upgrade Actions
1. The highest-impact revision step.
2. The second highest-impact revision step.
3. The third highest-impact revision step.

## Before / After Demonstration
### Current Passage
> Quote one weak passage from the essay.
### Level 5** Direction
> Rewrite the passage to show the target standard without changing the student's core idea.
### Why It Is Stronger
Explain using DSE marking keywords.`;

    if (mode === "upgrade_advice") {
      const upgradeSuggestion = await callAI(LOVABLE_API_KEY, "google/gemini-3-flash-preview", [
        { role: "system", content: upgradeAdvicePrompt },
        { role: "user", content: `Title: ${essay.title || "Untitled"}\n${essay.subject ? `Subject: ${essay.subject}\n` : ""}${essay.grade_level ? `Grade Level: ${essay.grade_level}\n` : ""}\nEssay:\n${essay.content}\n\nExisting AI feedback:\n${essay.feedback || "No existing feedback."}` },
      ], 3072) || "No upgrade advice generated.";
      return new Response(JSON.stringify({ upgradeSuggestion }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as grading only for the full grading flow, not for upgrade-advice generation.
    await supabase.from("essays").update({ status: "grading" }).eq("id", essayId);

    const systemPrompt = `You are an expert essay grading assistant used by teachers worldwide. Your task is to provide thorough, precise, and constructive feedback.
${hongKongLanguageRules}
${examinerModeInstructions}
${chineseRhetoricInstructions}

CRITICAL RULES:
1. **Language**: First, detect the language the essay is written in. Your ENTIRE response (headings, bullet points, paragraphs) MUST be written in the SAME language as the essay.${feedbackLangHint ? ` If the essay language is ambiguous, default to ${feedbackLangHint}.` : ""}
2. **Accuracy**: Read the essay extremely carefully. Do NOT hallucinate or fabricate content that does not appear in the essay. Every claim you make about the essay must be directly supported by actual text in the essay.
3. **Scoring**: Be calibrated and fair. A score of 90+ means genuinely excellent writing with minimal issues. A score of 50-70 means clear structural or content problems. Do not inflate scores.${rubricPrompt}
${tieredFeedbackInstructions}

Return your response in this exact structure (translate headings to the essay's language):

**Score: [X]/100**

## Strengths
- List 3-5 specific strengths, quoting or referencing actual sentences/phrases from the essay to support each point.

## Areas for Improvement
- List 3-5 specific weaknesses with concrete, actionable suggestions. Quote the problematic text and provide a corrected or improved version.
${validRubric ? `
### Rubric Breakdown
(Show the weighted scoring table as specified above)

## Detailed Analysis by Criterion
For each criterion in the rubric, provide a detailed analysis paragraph.` : defaultAnalysis}

## AI Rewriting Suggestions
For the 2-3 weakest passages in the essay, provide **concrete rewriting demonstrations**. Format each like:
### Original
> [Quote the original passage]
### Suggested Rewrite
> [Your improved version demonstrating the fix]
### Why This Is Better
[1-2 sentence explanation of the technique used]

## AI-Written Content Risk Assessment
Analyze the essay for signs it may have been written by AI. Consider:
- Uniformity of sentence length and structure
- Lack of personal voice, anecdotes, or genuine errors
- Overly generic phrasing and "textbook-perfect" transitions
- Unusual consistency in vocabulary sophistication

Provide a risk level: **Low** (likely human-written), **Medium** (some AI-like patterns), or **High** (strong AI indicators).
Format: **AI Detection: [Low/Medium/High]**
Brief explanation of your assessment (2-3 sentences).

## Summary
A concise 2-3 sentence overall assessment with the single most impactful improvement the student should focus on.`;

    const userPrompt = `Grade the following essay with precision. Read carefully and base all feedback on the actual content.
${essay.subject ? `Subject: ${essay.subject}` : ""}
${essay.grade_level ? `Grade Level: ${essay.grade_level}` : ""}
Title: ${essay.title || "Untitled"}

Essay:
${essay.content}`;

    let feedback = "";
    try {
      if (essay.content.length > LONG_ESSAY_CHAR_LIMIT) {
        const chunks = splitEssayIntoChunks(essay.content);
        const chunkFeedback = await Promise.all(chunks.map((chunk, index) => callAI(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
          { role: "system", content: `${systemPrompt}\n\nLONG ESSAY PARTIAL PASS: This is part ${index + 1} of ${chunks.length}. Do not give a final score yet. Identify concrete strengths, weaknesses, DSE Content/Language/Organization observations, and quote only from this part.` },
          { role: "user", content: `Title: ${essay.title || "Untitled"}\nPart ${index + 1}/${chunks.length}:\n${chunk}` },
        ], 2600)));

        feedback = await callAI(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
          { role: "system", content: `${systemPrompt}\n\nSYNTHESIS MODE: Combine the part-by-part notes into one polished final teacher report. Remove repetition. Include one final Score, DSE Content/Language/Organization scores out of 100, AI Detection, and Summary. Mention that the long essay was processed in sections for completeness.` },
          { role: "user", content: `Title: ${essay.title || "Untitled"}\n${essay.subject ? `Subject: ${essay.subject}\n` : ""}${essay.grade_level ? `Grade Level: ${essay.grade_level}\n` : ""}\nPart-by-part notes:\n${chunkFeedback.map((item, index) => `\n--- Part ${index + 1} ---\n${item}`).join("\n")}` },
        ], 5200) || "No feedback generated.";
      } else {
        feedback = await callAI(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ], 5200) || "No feedback generated.";
      }
    } catch (aiError) {
      await supabase.from("essays").update({ status: "error" }).eq("id", essayId);
      const status = aiError instanceof Error ? (aiError as Error & { status?: number }).status : undefined;

      if (status === 429) {
        return new Response(JSON.stringify({ error: aiError instanceof Error ? aiError.message : "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: aiError instanceof Error ? aiError.message : "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI grading failed");
    }

    // Extract score from feedback
    const scoreMatch = feedback.match(/Score:\s*(\d+)\s*\/\s*100/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    // Extract AI detection level
    const aiDetectMatch = feedback.match(/AI Detection:\s*\*?\*?(Low|Medium|High)\*?\*?/i);
    const aiDetectionLevel = aiDetectMatch ? aiDetectMatch[1].toLowerCase() : null;

    // Save feedback
    const { error: updateError } = await supabase
      .from("essays")
      .update({ feedback, score, status: "completed" })
      .eq("id", essayId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ feedback, score, aiDetectionLevel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
