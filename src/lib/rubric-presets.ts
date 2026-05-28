export interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

/**
 * Official rubric presets aligned with real examination standards.
 *
 * DSE Chinese — HKEAA 卷二寫作能力 (內容40/表達30/結構20/標點字體10, 另扣錯別字最多3分)
 * DSE English — HKEAA Writing: Content 7/21, Language 7/21, Organization 7/21
 * 
 * 香港小學中文 (Primary Chinese) — 按香港小學課程指引：內容40%/詞語20%/句子20%/結構10%/標點10%
 * 香港小學英文 (Primary English) — 按香港小學英文課程指引：Content 20%/Vocabulary 25%/Grammar 25%/Organization 15%/Mechanics 15%
 * 
 * IB — IB Diploma English A: Lang & Lit Paper 1/2: four criteria each worth 5 marks (25% each)
 * IELTS — British Council / IDP / Cambridge: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy (each 25%)
 * TOEFL — ETS iBT Writing: Integrated (0-5) & Academic Discussion (0-5); criteria: Development, Organization, Language Use
 */
export const RUBRIC_PRESETS: Record<string, { labelKey: string; criteria: RubricCriterion[] }> = {
  custom: {
    labelKey: "grade.rubricCustom",
    criteria: [
      { name: "Content & Ideas", weight: 30, description: "Thesis clarity, depth of argument, relevance" },
      { name: "Organization", weight: 20, description: "Structure, paragraph flow, transitions" },
      { name: "Language & Grammar", weight: 20, description: "Grammar, spelling, sentence variety" },
      { name: "Evidence & Support", weight: 20, description: "Use of examples, citations, data" },
      { name: "Style & Voice", weight: 10, description: "Tone, word choice, audience awareness" },
    ],
  },
  // ========== 香港小學中文寫作（Primary Chinese） ==========
  primary_chinese: {
    labelKey: "grade.rubricPrimChi",
    criteria: [
      {
        name: "內容",
        weight: 40,
        description: "切合題意、取材恰當、記敘/描寫/說明的完整性、感情真摯（配合小學課程指引）",
      },
      {
        name: "詞語",
        weight: 20,
        description: "詞彙運用準確、量詞搭配恰當、成語及形容詞運用",
      },
      {
        name: "句子",
        weight: 20,
        description: "句子結構完整、句式變化、複句運用、語氣流暢",
      },
      {
        name: "結構",
        weight: 10,
        description: "段落分明、層次清晰、過渡自然、開頭結尾完整",
      },
      {
        name: "標點字體",
        weight: 10,
        description: "標點符號正確、字體端正、格式規範",
      },
    ],
  },
  // ========== 香港小學英文寫作（Primary English） ==========
  primary_english: {
    labelKey: "grade.rubricPrimEng",
    criteria: [
      {
        name: "Content",
        weight: 20,
        description: "Relevance to topic, ideas development, staying on task (HK Primary Curriculum Guide 2024)",
      },
      {
        name: "Vocabulary",
        weight: 25,
        description: "Word choice, spelling accuracy, range of vocabulary appropriate for primary level",
      },
      {
        name: "Grammar",
        weight: 25,
        description: "Sentence structure, tenses, subject-verb agreement, punctuation, articles",
      },
      {
        name: "Organization",
        weight: 15,
        description: "Paragraphing, logical sequence, beginning/middle/end structure",
      },
      {
        name: "Mechanics & Presentation",
        weight: 15,
        description: "Letter formation, spacing, handwriting clarity, formatting (HK primary grading norms)",
      },
    ],
  },
  // ========== TSA 中文（全港性系統評估 — 小三/小六） ==========
  tsa_chinese: {
    labelKey: "grade.rubricTSAChi",
    criteria: [
      {
        name: "內容",
        weight: 40,
        description: "扣題、選材、記敘/描寫/說明的完整性（配合TSA評級指引）",
      },
      {
        name: "詞句",
        weight: 30,
        description: "詞彙運用、句子結構、語句通順程度",
      },
      {
        name: "結構",
        weight: 15,
        description: "分段、層次、過渡",
      },
      {
        name: "標點字體",
        weight: 15,
        description: "標點符號、字體清楚、整潔",
      },
    ],
  },
  // ========== TSA English（全港性系統評估 — Primary 3/6） ==========
  tsa_english: {
    labelKey: "grade.rubricTSAEng",
    criteria: [
      {
        name: "Content & Ideas",
        weight: 30,
        description: "Relevance, development of ideas, imagination (TSA Writing marking guidelines)",
      },
      {
        name: "Language & Grammar",
        weight: 35,
        description: "Grammar, punctuation, spelling, sentence accuracy",
      },
      {
        name: "Organization",
        weight: 20,
        description: "Coherence, paragraphing, logical sequence",
      },
      {
        name: "Presentation",
        weight: 15,
        description: "Handwriting, neatness, formatting (TSA criteria)",
      },
    ],
  },
  dse_chinese: {
    labelKey: "grade.rubricDSEChi",
    criteria: [
      { name: "內容", weight: 39, description: "切合題意、取材恰當、立意深刻、思想感情真摯（官方滿分40/103）" },
      { name: "表達", weight: 29, description: "文筆流暢、用詞準確、修辭恰當、語言得體（官方滿分30/103）" },
      { name: "結構", weight: 19, description: "層次分明、過渡自然、首尾呼應、段落安排合理（官方滿分20/103）" },
      { name: "標點字體", weight: 10, description: "標點符號正確、字體端正清晰（官方滿分10/103）" },
      { name: "錯別字", weight: 3, description: "錯別字扣分（重錯不重複計算，官方最多扣3分）" },
    ],
  },
  dse_english: {
    labelKey: "grade.rubricDSEEng",
    criteria: [
      {
        name: "Content",
        weight: 33,
        description:
          "Relevance and extent of content; awareness of purpose; creativity and imagination when appropriate（官方7/21分）",
      },
      {
        name: "Language & Style",
        weight: 34,
        description:
          "Range and accuracy of sentence structures; punctuation and grammar; vocabulary range and spelling; register, tone and style appropriate to text type（官方7/21分）",
      },
      {
        name: "Organization",
        weight: 33,
        description:
          "Coherent structure appropriate to genre/text type; effective paragraphing; cohesion between sentences and paragraphs（官方7/21分）",
      },
    ],
  },
  ib: {
    labelKey: "grade.rubricIB",
    criteria: [
      {
        name: "Understanding & Interpretation (Criterion A)",
        weight: 25,
        description:
          "Knowledge, understanding and interpretation of text(s); relevant references to support ideas（IB官方5分滿分）",
      },
      {
        name: "Analysis & Evaluation (Criterion B)",
        weight: 25,
        description:
          "Analysis and evaluation of authorial choices (language, technique, style, structure) and their effects（IB官方5分滿分）",
      },
      {
        name: "Focus & Organization (Criterion C)",
        weight: 25,
        description:
          "Coherent, focused and well-structured response; effective introduction and conclusion; logical progression（IB官方5分滿分）",
      },
      {
        name: "Language (Criterion D)",
        weight: 25,
        description:
          "Clear, varied and precise language; appropriate register and style; accurate grammar, vocabulary, and sentence construction（IB官方5分滿分）",
      },
    ],
  },
  ielts: {
    labelKey: "grade.rubricIELTS",
    criteria: [
      {
        name: "Task Response",
        weight: 25,
        description:
          "Address all parts of the task; present a clear position throughout; extend and support ideas; stay on topic（Band 1-9）",
      },
      {
        name: "Coherence & Cohesion",
        weight: 25,
        description:
          "Logical organization of information and ideas; appropriate paragraphing; skilful use of cohesive devices; clear central topic in each paragraph（Band 1-9）",
      },
      {
        name: "Lexical Resource",
        weight: 25,
        description:
          "Wide range of vocabulary; use of less common and idiomatic items; precision of word choice and collocation; control of spelling and word formation（Band 1-9）",
      },
      {
        name: "Grammatical Range & Accuracy",
        weight: 25,
        description:
          "Wide range of structures used accurately and appropriately; majority of sentences error-free; good control of grammar and punctuation（Band 1-9）",
      },
    ],
  },
  toefl: {
    labelKey: "grade.rubricTOEFL",
    criteria: [
      {
        name: "Development & Support",
        weight: 34,
        description:
          "Effectively addresses the topic; well-developed explanations, exemplifications, and/or details; appropriate and sufficient support for generalizations（ETS 0-5 scale）",
      },
      {
        name: "Organization",
        weight: 33,
        description:
          "Well-organized response with clear progression of ideas; appropriate use of transitions; unity and coherence throughout; effective introduction and conclusion（ETS 0-5 scale）",
      },
      {
        name: "Language Use",
        weight: 33,
        description:
          "Syntactic variety and range of vocabulary; idiomatic expression and appropriate word choice; minor lexical or grammatical errors acceptable at score 5; facility with language evident（ETS 0-5 scale）",
      },
    ],
  },
};
