import jsPDF from "jspdf";

interface ReportItem {
  studentName: string;
  fileName: string;
  score: number | null | undefined;
  wordCount: number;
  feedback: string | null | undefined;
  subject?: string;
  gradeLevel?: string;
  rubricScores?: { name: string; weight: number; score: number }[];
  abilityScores?: { content: number; language: number; organization: number };
  upgradeSuggestion?: string;
}

interface PDFOptions {
  logoDataUrl?: string | null;
  locale?: string;
  reportDate?: string;
  subscribed?: boolean;
}

interface ClassDashboardPDFOptions {
  title: string;
  subtitle: string;
  essayCount: number;
  averageScore: number;
  grammarErrors: { name: string; value: number }[];
  vocabularyDistribution: { band: string; count: number }[];
  dseLevelDistribution: { level: string; count: number }[];
  locale?: string;
}

interface InstitutionQuotationPDFOptions {
  locale?: string;
}

// --- i18n labels ---
const PDF_LABELS: Record<string, Record<string, string>> = {
  en: {
    reportTitle: "Essay Feedback Report",
    subject: "Subject",
    level: "Level",
    words: "Words",
    excellent: "Excellent",
    good: "Good",
    needsImprovement: "Needs Improvement",
    revisionNeeded: "Significant Revision Needed",
    rubricBreakdown: "Rubric Breakdown",
    criteriaWeight: "Criteria Weight Distribution",
    detailedFeedback: "Detailed Feedback",
    abilityTitle: "Student Ability Profile",
    abilitySubtitle: "DSE C / L / O radar chart and ability distribution",
    contentAbility: "Content",
    contentAbilityDesc: "Ideas, relevance and development",
    languageAbility: "Language",
    languageAbilityDesc: "Vocabulary, syntax and accuracy",
    organizationAbility: "Organization",
    organizationAbilityDesc: "Paragraphing, cohesion and structure",
    punctuationAbility: "Punctuation",
    punctuationAbilityDesc: "Punctuation, sentence boundaries and written conventions",
    disclaimer: "This report is AI-assisted and for teaching reference only. Final assessment is determined by the school/teacher. DSE/TSA level conversions are for reference and not official HKEAA results.",
    watermark: "FREE VERSION",
  },
  "zh-TW": {
    reportTitle: "作文批改報告",
    subject: "科目",
    level: "程度",
    words: "字數",
    excellent: "優秀",
    good: "良好",
    needsImprovement: "有待改善",
    revisionNeeded: "需大幅修改",
    rubricBreakdown: "評分細項",
    criteriaWeight: "評分標準權重分佈",
    detailedFeedback: "詳細評語",
    abilityTitle: "語文能力分佈圖",
    abilitySubtitle: "按 DSE 中文寫作語境呈現內容、表達、結構與標點表現",
    contentAbility: "內容",
    contentAbilityDesc: "立意、取材、例證及內容發展",
    languageAbility: "表達",
    languageAbilityDesc: "詞彙、句式、修辭及語氣控制",
    organizationAbility: "結構",
    organizationAbilityDesc: "段落鋪排、銜接、論點次序及整體章法",
    punctuationAbility: "標點",
    punctuationAbilityDesc: "標點、分句及書面語規範",
    disclaimer: "本報告由 AI 輔助生成，僅供教學參考。最終評分以學校/教師最終判斷為準。DSE/TSA 等級換算僅供參考，非 HKEAA 官方評核結果。",
    watermark: "免費版本",
  },
  "zh-CN": {
    reportTitle: "作文批改报告",
    subject: "科目",
    level: "程度",
    words: "字数",
    excellent: "优秀",
    good: "良好",
    needsImprovement: "有待改善",
    revisionNeeded: "需大幅修改",
    rubricBreakdown: "评分细项",
    criteriaWeight: "评分标准权重分布",
    detailedFeedback: "详细评语",
    abilityTitle: "语文能力分布图",
    abilitySubtitle: "按 DSE 中文写作语境呈现内容、表达、结构与标点表现",
    contentAbility: "内容",
    contentAbilityDesc: "立意、取材、例证及内容发展",
    languageAbility: "表达",
    languageAbilityDesc: "词汇、句式、修辞及语气控制",
    organizationAbility: "结构",
    organizationAbilityDesc: "段落铺排、衔接、论点次序及整体章法",
    punctuationAbility: "标点",
    punctuationAbilityDesc: "标点、分句及书面语规范",
    disclaimer: "本报告由 AI 辅助生成，仅供教学参考。最终评分以学校/教师最终判断为准。DSE/TSA 等级换算仅供参考，非 HKEAA 官方评核结果。",
    watermark: "免费版本",
  },
};

function getLabels(locale?: string): Record<string, string> {
  if (locale && PDF_LABELS[locale]) return PDF_LABELS[locale];
  if (locale?.startsWith("zh")) return PDF_LABELS["zh-TW"];
  return PDF_LABELS["en"];
}

// --- CJK Font Loading ---
const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/chinese-simplified-400-normal.ttf",
  bold: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/chinese-simplified-700-normal.ttf",
};

let fontCache: { regular?: ArrayBuffer; bold?: ArrayBuffer } = {};

async function loadFont(variant: "regular" | "bold"): Promise<ArrayBuffer> {
  if (fontCache[variant]) return fontCache[variant]!;
  const resp = await fetch(FONT_URLS[variant]);
  if (!resp.ok) throw new Error(`Failed to load CJK font (${variant})`);
  const buf = await resp.arrayBuffer();
  fontCache[variant] = buf;
  return buf;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function registerCJKFont(doc: jsPDF): Promise<void> {
  try {
    const [regular, bold] = await Promise.all([loadFont("regular"), loadFont("bold")]);
    const regB64 = arrayBufferToBase64(regular);
    const boldB64 = arrayBufferToBase64(bold);
    doc.addFileToVFS("NotoSansSC-Regular.ttf", regB64);
    doc.addFont("NotoSansSC-Regular.ttf", "NotoSansSC", "normal");
    doc.addFileToVFS("NotoSansSC-Bold.ttf", boldB64);
    doc.addFont("NotoSansSC-Bold.ttf", "NotoSansSC", "bold");
  } catch {
    console.warn("CJK font loading failed, falling back to helvetica");
  }
}

function hasCJK(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/.test(text);
}

function getFontFamily(doc: jsPDF): string {
  try {
    doc.setFont("NotoSansSC", "normal");
    return "NotoSansSC";
  } catch {
    return "helvetica";
  }
}

// --- Helpers ---

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/---+/g, "")
    .trim();
}

function normalizeDseChineseText(text: string): string {
  return text
    .replace(/Content（內容）|Content/g, "內容")
    .replace(/Language（語言）|Language/g, "表達")
    .replace(/Organization（組織）|Organization/g, "結構")
    .replace(/Subject-Verb Agreement|主謂不一致/g, "主謂配搭不當")
    .replace(/Article \/ Noun Control|冠詞及名詞搭配/g, "虛詞運用與量詞配搭")
    .replace(/Collocation Errors|collocation notebook/gi, "詞語配搭")
    .replace(/Not only\.\.\. but also\.\.\./gi, "排比、對比與層遞")
    .replace(/(\d+)\.\s+(\d+)/g, "$1.$2")
    .replace(/\s+([，。；：！？、])/g, "$1")
    .replace(/([（「『])\s+/g, "$1")
    .replace(/\s+([）」』])/g, "$1")
    .trim();
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function getScoreInfo(score: number, labels: Record<string, string>): { label: string; color: [number, number, number] } {
  if (score >= 80) return { label: labels.excellent, color: [22, 163, 74] };
  if (score >= 70) return { label: labels.good, color: [34, 139, 34] };
  if (score >= 50) return { label: labels.needsImprovement, color: [202, 138, 4] };
  return { label: labels.revisionNeeded, color: [220, 38, 38] };
}

// --- Chart Drawing Helpers ---

function drawScoreGauge(doc: jsPDF, x: number, y: number, score: number, fontFamily: string, labels: Record<string, string>) {
  const cx = x + 30;
  const cy = y + 30;
  const r = 25;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(4);
  for (let angle = 180; angle <= 360; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad);
    const y1 = cy + r * Math.sin(rad);
    const rad2 = ((angle + 2) * Math.PI) / 180;
    const x2 = cx + r * Math.cos(rad2);
    const y2 = cy + r * Math.sin(rad2);
    doc.line(x1, y1, x2, y2);
  }

  const info = getScoreInfo(score, labels);
  doc.setDrawColor(...info.color);
  doc.setLineWidth(4);
  const endAngle = 180 + (score / 100) * 180;
  for (let angle = 180; angle <= endAngle; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad);
    const y1 = cy + r * Math.sin(rad);
    const rad2 = ((angle + 2) * Math.PI) / 180;
    const x2 = cx + r * Math.cos(rad2);
    const y2 = cy + r * Math.sin(rad2);
    doc.line(x1, y1, x2, y2);
  }

  doc.setLineWidth(0.2);
  doc.setFontSize(20);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...info.color);
  doc.text(`${score}`, cx, cy - 2, { align: "center" });
  doc.setFontSize(8);
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("/ 100", cx, cy + 5, { align: "center" });
  doc.setFontSize(9);
  doc.text(info.label, cx, cy + 12, { align: "center" });
}

function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  items: { name: string; score: number; weight: number }[],
  fontFamily: string,
  labels: Record<string, string>
) {
  const barHeight = 8;
  const gap = 12;
  const maxBarWidth = width - 50;
  const labelWidth = 45;

  doc.setFontSize(10);
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(labels.rubricBreakdown, x, y);
  y += 8;

  for (const item of items) {
    doc.setFontSize(7);
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(71, 85, 105);
    const truncName = item.name.length > 18 ? item.name.slice(0, 16) + "…" : item.name;
    doc.text(truncName, x, y + barHeight / 2 + 1);

    const barX = x + labelWidth;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(barX, y, maxBarWidth, barHeight, 2, 2, "F");

    const info = getScoreInfo(item.score, labels);
    doc.setFillColor(...info.color);
    const filledWidth = Math.max(2, (item.score / 100) * maxBarWidth);
    doc.roundedRect(barX, y, filledWidth, barHeight, 2, 2, "F");

    doc.setFontSize(7);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${item.score}`, barX + maxBarWidth + 3, y + barHeight / 2 + 1);

    y += gap;
  }

  return y;
}

function drawPieChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  items: { name: string; weight: number }[],
  fontFamily: string
) {
  const colors: [number, number, number][] = [
    [59, 130, 246],
    [16, 185, 129],
    [245, 158, 11],
    [239, 68, 68],
    [139, 92, 246],
    [236, 72, 153],
  ];

  let startAngle = -90;

  items.forEach((item, i) => {
    const sliceAngle = (item.weight / 100) * 360;
    const endAngle = startAngle + sliceAngle;
    const color = colors[i % colors.length];

    doc.setFillColor(...color);
    for (let a = startAngle; a < endAngle; a += 1) {
      const r1 = (a * Math.PI) / 180;
      const r2 = ((a + 1) * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(r1);
      const y1 = cy + radius * Math.sin(r1);
      const x2 = cx + radius * Math.cos(r2);
      const y2 = cy + radius * Math.sin(r2);
      doc.triangle(cx, cy, x1, y1, x2, y2, "F");
    }

    const legendY = cy - radius + i * 10;
    const legendX = cx + radius + 8;
    doc.setFillColor(...color);
    doc.rect(legendX, legendY - 3, 4, 4, "F");
    doc.setFontSize(6.5);
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(51, 65, 85);
    const label = item.name.length > 20 ? item.name.slice(0, 18) + "…" : item.name;
    doc.text(`${label} (${item.weight}%)`, legendX + 6, legendY);

    startAngle = endAngle;
  });
}

function drawAbilityProfile(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  abilityScores: { content: number; language: number; organization: number },
  fontFamily: string,
  labels: Record<string, string>
) {
  const items = [
    { key: "content", label: labels.contentAbility, desc: labels.contentAbilityDesc, score: abilityScores.content },
    { key: "language", label: labels.languageAbility, desc: labels.languageAbilityDesc, score: abilityScores.language },
    { key: "organization", label: labels.organizationAbility, desc: labels.organizationAbilityDesc, score: abilityScores.organization },
    { key: "punctuation", label: labels.punctuationAbility || "標點", desc: labels.punctuationAbilityDesc || "標點、分句與書面規範", score: Math.round((abilityScores.language * 0.7 + abilityScores.organization * 0.3) * 0.95) },
  ];
  const cardHeight = 82;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, cardHeight, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, cardHeight, 3, 3, "S");

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(labels.abilityTitle, x + 5, y + 8);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(labels.abilitySubtitle, x + 5, y + 14);

  const cx = x + 37;
  const cy = y + 49;
  const radius = 21;
  const angles = [-90, 0, 90, 180].map((angle) => (angle * Math.PI) / 180);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  [0.33, 0.66, 1].forEach((scale) => {
    const points = angles.map((angle) => [cx + radius * scale * Math.cos(angle), cy + radius * scale * Math.sin(angle)] as [number, number]);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      doc.line(point[0], point[1], next[0], next[1]);
    });
  });
  angles.forEach((angle) => doc.line(cx, cy, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)));
  const scorePoints = items.map((item, index) => {
    const scoreRadius = radius * (Math.max(0, Math.min(100, item.score)) / 100);
    return [cx + scoreRadius * Math.cos(angles[index]), cy + scoreRadius * Math.sin(angles[index])] as [number, number];
  });
  doc.setFillColor(30, 64, 175);
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1.2);
  doc.lines(
    scorePoints.slice(1).map((point, index) => [point[0] - scorePoints[index][0], point[1] - scorePoints[index][1]]),
    scorePoints[0][0],
    scorePoints[0][1],
    [1, 1],
    "FD",
    true
  );
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(items[0].label, cx, cy - radius - 4, { align: "center" });
  doc.text(items[1].label, cx + radius + 4, cy + 2);
  doc.text(items[2].label, cx, cy + radius + 6, { align: "center" });
  doc.text(items[3].label, cx - radius - 4, cy + 2, { align: "right" });

  let barY = y + 22;
  const barX = x + 74;
  const barWidth = width - 82;
  items.forEach((item) => {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.label, barX, barY);
    doc.text(`${item.score}/100`, x + width - 6, barY, { align: "right" });
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.desc, barX, barY + 5);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, barY + 8, barWidth, 3.2, 1.5, 1.5, "F");
    doc.setFillColor(30, 64, 175);
    doc.roundedRect(barX, barY + 8, Math.max(2, (item.score / 100) * barWidth), 3.2, 1.5, 1.5, "F");
    barY += 14;
  });
  return y + cardHeight;
}

// --- Watermark ---

function drawWatermark(doc: jsPDF, text: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.saveGraphicsState();
  // @ts-ignore - jsPDF supports setGState
  const gs = new (doc as any).GState({ opacity: 0.08 });
  // @ts-ignore
  doc.setGState(gs);
  doc.setFontSize(60);
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "bold");

  // Diagonal watermark repeated
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  doc.text(text, cx, cy - 30, { align: "center", angle: 45 });
  doc.text(text, cx, cy + 50, { align: "center", angle: 45 });

  doc.restoreGraphicsState();
}

// --- Professional 3-page student report renderer ---

type Palette = {
  ink: [number, number, number];
  muted: [number, number, number];
  line: [number, number, number];
  soft: [number, number, number];
  navy: [number, number, number];
  blue: [number, number, number];
  green: [number, number, number];
  amber: [number, number, number];
};

const REPORT_PALETTE: Palette = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  line: [203, 213, 225],
  soft: [248, 250, 252],
  navy: [12, 35, 64],
  blue: [30, 64, 175],
  green: [13, 122, 95],
  amber: [202, 138, 4],
};

function drawReportFrame(
  doc: jsPDF,
  pageTitle: string,
  pageLabel: string,
  fontFamily: string,
  options?: { logoDataUrl?: string | null; reportDate?: string; subscribed?: boolean; locale?: string }
) {
  const labels = getLabels(options?.locale);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  if (!options?.subscribed) drawWatermark(doc, labels.watermark);

  doc.setFillColor(...REPORT_PALETTE.navy);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setFillColor(...REPORT_PALETTE.green);
  doc.rect(0, 30, pageWidth, 1.4, "F");

  let brandX = margin;
  if (options?.logoDataUrl) {
    try {
      doc.addImage(options.logoDataUrl, "PNG", margin, 5, 20, 20);
      brandX = margin + 25;
    } catch {
      brandX = margin;
    }
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(options?.logoDataUrl ? "Compify.Pro" : "Compify.Pro", brandX, 13);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(options?.locale?.startsWith("zh") ? "香港中文寫作專業評核報告" : "Professional AI Grading Report", brandX, 21);
  doc.text(options?.reportDate || new Date().toLocaleDateString(options?.locale?.startsWith("zh") ? "zh-TW" : "en-US"), pageWidth - margin, 13, { align: "right" });
  doc.text(options?.locale?.startsWith("zh") ? pageLabel.replace(/Page/g, "頁面") : pageLabel, pageWidth - margin, 21, { align: "right" });

  doc.setDrawColor(...REPORT_PALETTE.line);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont(fontFamily, "bold");
  doc.text("COMPIFY.PRO", margin, pageHeight - 11);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6.5);
  doc.text(labels.disclaimer || "", pageWidth - margin, pageHeight - 11, { align: "right" });

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...REPORT_PALETTE.ink);
  doc.text(pageTitle, margin, 43);
}

function drawSectionHeading(doc: jsPDF, title: string, x: number, y: number, fontFamily: string) {
  doc.setFillColor(...REPORT_PALETTE.blue);
  doc.rect(x, y - 4.2, 2.2, 6.2, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...REPORT_PALETTE.ink);
  doc.text(title, x + 5, y);
}

function drawSoftBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...REPORT_PALETTE.soft);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "S");
}

function scoreToLevel(score: number | null | undefined, gradeLevel?: string) {
  const value = score ?? 60;
  // Primary school: A / B / C / D / E
  if (gradeLevel && ["elementary", "Elementary"].includes(gradeLevel)) {
    if (value >= 80) return "A";
    if (value >= 65) return "B";
    if (value >= 50) return "C";
    if (value >= 35) return "D";
    return "E";
  }
  // Secondary / DSE: Level 5** to Level 1
  if (value >= 92) return "Level 5**";
  if (value >= 85) return "Level 5*";
  if (value >= 75) return "Level 5";
  if (value >= 65) return "Level 4";
  if (value >= 52) return "Level 3";
  if (value >= 40) return "Level 2";
  return "Level 1";
}

function bandScore(score: number) {
  if (score >= 86) return 6;
  if (score >= 72) return 5;
  if (score >= 58) return 4;
  if (score >= 44) return 3;
  if (score >= 30) return 2;
  return 1;
}

function extractKeyLines(feedback: string | null | undefined, limit = 6): string[] {
  const plain = stripMarkdown(feedback || "");
  return plain
    .split(/\n+|(?<=。)|(?<=\.)/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter((line) => line.length >= 12 && line.length <= 150)
    .slice(0, limit);
}

function clippedLines(doc: jsPDF, text: string, width: number, maxLines: number): string[] {
  const lines = wrapText(doc, normalizeDseChineseText(text), width);
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].slice(0, 42)}…`];
}

function abilitySummary(abilityScores?: { content: number; language: number; organization: number }) {
  const scores = abilityScores || { content: 68, language: 62, organization: 66 };
  const entries = [
    { key: "content", label: "內容", score: scores.content, note: "立意、取材、本地例證與扣題意識" },
    { key: "language", label: "表達", score: scores.language, note: "詞彙、句式、修辭與語氣控制" },
    { key: "organization", label: "結構", score: scores.organization, note: "段落鋪排、銜接與整體章法" },
  ];
  const weakest = entries.reduce((a, b) => (a.score <= b.score ? a : b));
  const strongest = entries.reduce((a, b) => (a.score >= b.score ? a : b));
  return { scores, entries, weakest, strongest };
}

// Parse markdown feedback into named sections (## Heading => content)
function parseFeedbackSections(feedback: string | null | undefined): Record<string, string> {
  const sections: Record<string, string> = {};
  if (!feedback) return sections;
  const lines = feedback.split(/\r?\n/);
  let currentKey = "_intro";
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) sections[currentKey] = (sections[currentKey] ? sections[currentKey] + "\n" : "") + text;
    buffer = [];
  };
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      flush();
      currentKey = h[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function findSection(sections: Record<string, string>, keywords: string[]): string {
  for (const k of Object.keys(sections)) {
    const lower = k.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return sections[k];
  }
  return "";
}

// Extract strengths as discrete bullet items
function extractBulletItems(text: string): string[] {
  if (!text) return [];
  const items: string[] = [];
  const lines = text.split(/\r?\n/);
  let current = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (current) { items.push(current.trim()); current = ""; }
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+[.、)]\s+(.*)$/);
    if (bullet) {
      if (current) items.push(current.trim());
      current = bullet[1];
    } else {
      current += (current ? " " : "") + line;
    }
  }
  if (current) items.push(current.trim());
  return items
    .map((s) => stripMarkdown(s).trim())
    .filter((s) => s.length > 4);
}

// Detect a markdown pipe-table starting at index i, return rows + new index
function consumeMarkdownTable(lines: string[], startIdx: number): { rows: string[][]; nextIdx: number } | null {
  const isRow = (s: string) => /^\s*\|.*\|\s*$/.test(s);
  if (!isRow(lines[startIdx] || "")) return null;
  // need at least header + separator
  const sep = lines[startIdx + 1] || "";
  if (!/^\s*\|?\s*:?-{2,}/.test(sep.replace(/\|/g, "|"))) return null;
  const rows: string[][] = [];
  const parse = (s: string) =>
    s.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  rows.push(parse(lines[startIdx]));
  let i = startIdx + 2;
  while (i < lines.length && isRow(lines[i])) {
    const cells = parse(lines[i]);
    if (cells.length && !cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
    i++;
  }
  return rows.length >= 2 ? { rows, nextIdx: i } : null;
}

function drawMarkdownTable(
  doc: jsPDF,
  rows: string[][],
  x: number,
  y: number,
  width: number,
  fontFamily: string,
  ensure: (n: number) => number
): number {
  const cols = rows[0].length;
  const colW = width / cols;
  const rowH = 8;
  // Header
  y = ensure(rowH);
  doc.setFillColor(...REPORT_PALETTE.navy);
  doc.rect(x, y, width, rowH, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  rows[0].forEach((cell, ci) => {
    const lines = doc.splitTextToSize(cell, colW - 4) as string[];
    doc.text(lines[0] || "", x + ci * colW + 2, y + 5.5);
  });
  y += rowH;
  // Body
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // measure
    let maxLines = 1;
    const cellLines = row.map((c) => {
      const ls = doc.splitTextToSize(c, colW - 4) as string[];
      maxLines = Math.max(maxLines, ls.length);
      return ls;
    });
    const h = Math.max(rowH, maxLines * 4.4 + 3);
    y = ensure(h);
    doc.setFillColor(r % 2 === 0 ? 248 : 255, 250, 252);
    doc.rect(x, y, width, h, "F");
    doc.setDrawColor(...REPORT_PALETTE.line);
    doc.setLineWidth(0.2);
    doc.rect(x, y, width, h, "S");
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(...REPORT_PALETTE.ink);
    cellLines.forEach((ls, ci) => {
      ls.forEach((line, li) => doc.text(line, x + ci * colW + 2, y + 5 + li * 4.2));
    });
    y += h;
  }
  return y + 2;
}

// Render markdown-ish text block, page-break aware
function renderMarkdownBlock(
  doc: jsPDF,
  text: string,
  startY: number,
  margin: number,
  contentWidth: number,
  fontFamily: string,
  pageHeader: () => void
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - 22;
  let y = startY;
  const ensure = (need: number): number => {
    if (y + need > bottomLimit) {
      doc.addPage();
      pageHeader();
      y = 55;
    }
    return y;
  };
  // Split into lines first to detect tables
  const rawLines = normalizeDseChineseText(text || "").split(/\r?\n/);
  // Process with table detection
  const blocks: Array<{ kind: "block"; text: string } | { kind: "table"; rows: string[][] }> = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tbl = consumeMarkdownTable(rawLines, i);
      if (tbl) {
        blocks.push({ kind: "table", rows: tbl.rows });
        i = tbl.nextIdx;
        continue;
      }
    }
    // accumulate normal block (non-empty lines until blank)
    if (line.trim()) {
      blocks.push({ kind: "block", text: line.trim() });
    }
    i++;
  }
  blocks.forEach((b) => {
    if (b.kind === "table") {
      y = drawMarkdownTable(doc, b.rows, margin, y + 1, contentWidth, fontFamily, ensure);
      return;
    }
    const block = b.text;
    const headingMatch = block.match(/^(#{1,6})\s+(.*)$/);
    const isBullet = /^[-*•]\s+/.test(block) || /^\d+[.、)]\s+/.test(block);
    const isQuote = /^>\s+/.test(block);
    const clean = block
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.、)]\s+/, "")
      .replace(/^>\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    if (headingMatch) {
      ensure(8);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(headingMatch[1].length <= 2 ? 10.5 : 9.5);
      doc.setTextColor(...REPORT_PALETTE.blue);
      wrapText(doc, clean, contentWidth).forEach((line) => {
        ensure(6);
        doc.text(line, margin, y);
        y += 5.6;
      });
      y += 2;
    } else if (isBullet) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(51, 65, 85);
      const lines = wrapText(doc, clean, contentWidth - 6);
      lines.forEach((line, idx) => {
        ensure(5);
        if (idx === 0) {
          doc.setFont(fontFamily, "bold");
          doc.setTextColor(...REPORT_PALETTE.blue);
          doc.text("•", margin, y);
          doc.setFont(fontFamily, "normal");
          doc.setTextColor(51, 65, 85);
        }
        doc.text(line, margin + 5, y);
        y += 4.6;
      });
      y += 1.2;
    } else if (isQuote) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...REPORT_PALETTE.muted);
      const lines = wrapText(doc, clean, contentWidth - 8);
      lines.forEach((line) => {
        ensure(5);
        doc.setDrawColor(...REPORT_PALETTE.blue);
        doc.setLineWidth(1.2);
        doc.line(margin + 1, y - 3.2, margin + 1, y + 0.6);
        doc.text(line, margin + 5, y);
        y += 4.6;
      });
      y += 1.4;
    } else {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(...REPORT_PALETTE.ink);
      wrapText(doc, clean, contentWidth).forEach((line) => {
        ensure(5);
        doc.text(line, margin, y);
        y += 4.6;
      });
      y += 1.8;
    }
  });
  return y;
}

function buildSummary(sections: Record<string, string>, feedback: string | null | undefined, weakestLabel: string): string {
  const summary = findSection(sections, ["summary", "總評", "总评", "整體", "整体"]);
  let text = stripMarkdown(summary || "").trim();
  if (!text) {
    const keyLines = extractKeyLines(feedback, 4);
    text = keyLines.join(" ");
  }
  if (!text) {
    text = `該生整體表現具備穩固基礎，現階段最值得跟進的是${weakestLabel}。建議以立意深化、修辭運用及段落推進作為下一階段訓練重點。`;
  }
  // Trim to ~100 Chinese chars
  if (text.length > 110) text = text.slice(0, 105).replace(/[，、；：,;:\s]+$/, "") + "…";
  return text;
}

function renderProfessionalReport(
  doc: jsPDF,
  item: ReportItem,
  fontFamily: string,
  options?: {
    indexLabel?: string;
    logoDataUrl?: string | null;
    locale?: string;
    reportDate?: string;
    subscribed?: boolean;
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const { scores, weakest } = abilitySummary(item.abilityScores);
  const finalLevel = scoreToLevel(item.score, item.gradeLevel);
  const date = options?.reportDate || new Date().toISOString().slice(0, 10);
  const totalScore = typeof item.score === "number" ? item.score : 0;
  const sections = parseFeedbackSections(item.feedback);
  const summaryText = buildSummary(sections, item.feedback, weakest.label);

  // Build rubric breakdown: prefer rubricScores from item; fallback to ability-derived
  const rubricItems: { name: string; weight: number; score: number; max: number }[] = (() => {
    if (item.rubricScores && item.rubricScores.length > 0) {
      return item.rubricScores.map((r) => ({
        name: r.name,
        weight: r.weight,
        score: Math.round((r.score * r.weight) / 100), // weighted points
        max: r.weight,
      }));
    }
    const fallback = [
      { name: "內容", weight: 40, raw: scores.content },
      { name: "表達", weight: 35, raw: scores.language },
      { name: "結構", weight: 25, raw: scores.organization },
    ];
    return fallback.map((r) => ({ name: r.name, weight: r.weight, score: Math.round((r.raw * r.weight) / 100), max: r.weight }));
  })();

  const hasUpgrade = !!(item.upgradeSuggestion && item.upgradeSuggestion.trim());
  // Page count is dynamic; we still print "Page N" labels via plain text
  const pageSuffix = options?.indexLabel ? ` · ${options.indexLabel}` : "";
  let currentPage = 1;
  const headerFor = (title: string) => {
    drawReportFrame(doc, title, `Page ${currentPage}${pageSuffix}`, fontFamily, options);
  };

  // ============ PAGE 1: Total score, rubric breakdown, DSE level, summary, ability ============
  headerFor("【Compify.pro 專業評核報告 — 總覽】");
  let y = 51;

  // Meta line
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...REPORT_PALETTE.muted);
  doc.text(`學生編號：${item.studentName || "未命名學生"}`, margin, y);
  doc.text(`評核日期：${date}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...REPORT_PALETTE.ink);
  clippedLines(doc, `題目：${item.fileName || item.studentName}`, contentWidth, 2).forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 4;

  // Hero total-score banner
  const heroH = 34;
  doc.setFillColor(...REPORT_PALETTE.navy);
  doc.roundedRect(margin, y, contentWidth, heroH, 3, 3, "F");
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("總分 (Total Score)", margin + 8, y + 11);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(34);
  doc.setTextColor(255, 255, 255);
  doc.text(`${totalScore}`, margin + 8, y + 28);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text("/ 100", margin + 8 + doc.getTextWidth(`${totalScore}`) + 3, y + 28);

  // DSE level pill on the right
  doc.setFillColor(...REPORT_PALETTE.green);
  const pillW = 78;
  const pillX = margin + contentWidth - pillW - 8;
  doc.roundedRect(pillX, y + 7, pillW, 20, 3, 3, "F");
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 252, 231);
  const isPrimary = item.gradeLevel && ["elementary", "Elementary"].includes(item.gradeLevel);
  doc.text(isPrimary ? "評級參考" : "DSE 換算參考等級", pillX + pillW / 2, y + 13, { align: "center" });
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(finalLevel.replace("Level ", ""), pillX + pillW / 2, y + 23, { align: "center" });
  y += heroH + 8;

  // Rubric breakdown table (weighted)
  drawSectionHeading(doc, "一、評分範疇分數", margin, y, fontFamily);
  y += 8;
  const rCols = [contentWidth * 0.42, contentWidth * 0.16, contentWidth * 0.42];
  doc.setFillColor(...REPORT_PALETTE.navy);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("範疇 (權重)", margin + 3, y + 5.5);
  doc.text("分數", margin + rCols[0] + rCols[1] / 2, y + 5.5, { align: "center" });
  doc.text("分數條", margin + rCols[0] + rCols[1] + 3, y + 5.5);
  y += 8;
  rubricItems.forEach((r) => {
    const rowH = 11;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, rowH, "F");
    doc.setDrawColor(...REPORT_PALETTE.line);
    doc.rect(margin, y, contentWidth, rowH, "S");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8.4);
    doc.setTextColor(...REPORT_PALETTE.ink);
    doc.text(`${r.name} (${r.weight}%)`, margin + 3, y + 7);
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_PALETTE.blue);
    doc.text(`${r.score} / ${r.max}`, margin + rCols[0] + rCols[1] / 2, y + 7.2, { align: "center" });
    // bar
    const barX = margin + rCols[0] + rCols[1] + 3;
    const barW = rCols[2] - 6;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, y + 4, barW, 3.4, 1.5, 1.5, "F");
    doc.setFillColor(...REPORT_PALETTE.green);
    const ratio = r.max > 0 ? r.score / r.max : 0;
    doc.roundedRect(barX, y + 4, Math.max(2, barW * ratio), 3.4, 1.5, 1.5, "F");
    y += rowH;
  });
  y += 6;

  // Summary (~100 chars)
  drawSectionHeading(doc, "二、總評", margin, y, fontFamily);
  y += 7;
  drawSoftBox(doc, margin, y, contentWidth, 28);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(51, 65, 85);
  wrapText(doc, summaryText, contentWidth - 12).slice(0, 4).forEach((line, idx) => {
    doc.text(line, margin + 6, y + 8 + idx * 5);
  });
  y += 34;

  // Ability data
  drawSectionHeading(doc, "三、語文能力數據分析", margin, y, fontFamily);
  y += 6;
  drawAbilityProfile(doc, margin, y, contentWidth, scores, fontFamily, getLabels(options?.locale));

  // ============ PAGE 2: Strengths (paragraphed) ============
  doc.addPage();
  currentPage += 1;
  headerFor("【Compify.pro 專業評核報告 — 優點分析】");
  y = 53;
  drawSectionHeading(doc, "四、優點 (Strengths)", margin, y, fontFamily);
  y += 8;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...REPORT_PALETTE.muted);
  doc.text("以下優點根據批改內容整理，分段列出方便逐項複習：", margin, y);
  y += 7;

  const strengthsText = findSection(sections, ["strength", "優點", "优点", "亮點", "亮点"]);
  const strengths = extractBulletItems(strengthsText);
  if (strengths.length === 0) {
    drawSoftBox(doc, margin, y, contentWidth, 18);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...REPORT_PALETTE.muted);
    doc.text("批改內容未明確列出優點，請參閱詳細分析。", margin + 6, y + 11);
    y += 24;
  } else {
    strengths.forEach((s, idx) => {
      const lines = wrapText(doc, s, contentWidth - 18);
      const boxH = Math.max(16, 8 + lines.length * 4.6);
      // page break
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + boxH > pageHeight - 22) {
        doc.addPage();
        currentPage += 1;
        headerFor("【Compify.pro 專業評核報告 — 優點分析（續）】");
        y = 53;
      }
      drawSoftBox(doc, margin, y, contentWidth, boxH);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...REPORT_PALETTE.green);
      doc.text(`${idx + 1}`, margin + 5, y + 9);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(51, 65, 85);
      lines.forEach((line, i) => doc.text(line, margin + 13, y + 8 + i * 4.6));
      y += boxH + 4;
    });
  }

  // ============ Improvements (改善空間) ============
  const improvementsText = findSection(sections, [
    "改善空間", "改善空间", "areas for improvement", "areas to improve", "improvement", "weaknesses", "待改善", "待改进", "改善建議", "改善建议",
  ]);
  if (improvementsText) {
    doc.addPage();
    currentPage += 1;
    headerFor("【Compify.pro 專業評核報告 — 改善空間】");
    y = 53;
    drawSectionHeading(doc, "五、改善空間 (Areas for Improvement)", margin, y, fontFamily);
    y += 8;
    y = renderMarkdownBlock(
      doc,
      improvementsText,
      y,
      margin,
      contentWidth,
      fontFamily,
      () => {
        currentPage += 1;
        headerFor("【Compify.pro 專業評核報告 — 改善空間（續）】");
      }
    );
  }

  // ============ Detailed analysis + rhetoric detection ============
  doc.addPage();
  currentPage += 1;
  headerFor("【Compify.pro 專業評核報告 — 詳細分析】");
  y = 53;
  drawSectionHeading(doc, "六、詳細分析 (Detailed Analysis)", margin, y, fontFamily);
  y += 8;
  const analysisText =
    findSection(sections, ["detailed analysis", "詳細分析", "详细分析", "analysis by criterion", "詳細準則分析", "详细准则分析", "criteria analysis"]) ||
    stripMarkdown(item.feedback || "").slice(0, 1200);
  y = renderMarkdownBlock(
    doc,
    analysisText,
    y,
    margin,
    contentWidth,
    fontFamily,
    () => {
      currentPage += 1;
      headerFor("【Compify.pro 專業評核報告 — 詳細分析（續）】");
    }
  );

  y += 4;
  // Page break before rhetoric if low
  const ph = doc.internal.pageSize.getHeight();
  if (y > ph - 60) {
    doc.addPage();
    currentPage += 1;
    headerFor("【Compify.pro 專業評核報告 — 修辭手法偵測】");
    y = 53;
  }
  drawSectionHeading(doc, "七、修辭手法偵測", margin, y, fontFamily);
  y += 8;
  const rhetoric = findSection(sections, ["修辭手法", "修辞手法", "rhetorical", "rhetoric"]);
  if (rhetoric) {
    y = renderMarkdownBlock(
      doc,
      rhetoric,
      y,
      margin,
      contentWidth,
      fontFamily,
      () => {
        currentPage += 1;
        headerFor("【Compify.pro 專業評核報告 — 修辭手法偵測（續）】");
      }
    );
  } else {
    drawSoftBox(doc, margin, y, contentWidth, 18);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...REPORT_PALETTE.muted);
    doc.text("本文未偵測到明顯的中文修辭手法，建議下次寫作嘗試加入排比、對比、層遞或借代。", margin + 6, y + 11);
    y += 22;
  }

  // ============ PAGE 4: AI Rewriting Suggestions (from feedback) ============
  const rewriting = findSection(sections, ["ai rewriting", "rewriting suggestion", "人工智能改寫", "人工智能改写", "改寫建議", "改写建议"]);
  if (rewriting) {
    doc.addPage();
    currentPage += 1;
    headerFor("【Compify.pro 專業評核報告 — 人工智能改寫建議】");
    y = 53;
    drawSectionHeading(doc, "八、人工智能改寫建議 (AI Rewriting Suggestions)", margin, y, fontFamily);
    y += 8;
    renderMarkdownBlock(
      doc,
      rewriting,
      y,
      margin,
      contentWidth,
      fontFamily,
      () => {
        currentPage += 1;
        headerFor("【Compify.pro 專業評核報告 — 人工智能改寫建議（續）】");
      }
    );
  }

  // ============ PAGE 5: Level 5** Upgrade Coaching ============
  if (hasUpgrade) {
    doc.addPage();
    currentPage += 1;
    headerFor("【Compify.pro 專業評核報告 — Level 5** 升級建議】");
    let uy = 53;
    drawSectionHeading(doc, "九、Level 5** 升級建議 (AI Examiner Coaching)", margin, uy, fontFamily);
    uy += 9;
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...REPORT_PALETTE.muted);
    clippedLines(doc, "以下建議由 AI 考官模式生成，針對如何將本文進一步推進至 Level 5** 水平，請對照原文逐項落實。", contentWidth, 2).forEach((line, idx) => {
      doc.text(line, margin, uy + idx * 4.4);
    });
    uy += 12;
    renderMarkdownBlock(
      doc,
      item.upgradeSuggestion || "",
      uy,
      margin,
      contentWidth,
      fontFamily,
      () => {
        currentPage += 1;
        headerFor("【Compify.pro 專業評核報告 — Level 5** 升級建議（續）】");
      }
    );
  }
}

// --- Render one report page ---

function renderReport(
  doc: jsPDF,
  item: ReportItem,
  fontFamily: string,
  options?: {
    indexLabel?: string;
    logoDataUrl?: string | null;
    locale?: string;
    reportDate?: string;
    subscribed?: boolean;
  }
) {
  renderProfessionalReport(doc, item, fontFamily, options);
}

// --- Public API ---

export async function exportSinglePDF(item: ReportItem, pdfOptions?: PDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const allText = [item.studentName, item.feedback || "", item.subject || "", item.fileName].join("");
  const needCJK = hasCJK(allText) || pdfOptions?.locale?.startsWith("zh");
  if (needCJK) {
    await registerCJKFont(doc);
  }

  const fontFamily = needCJK ? getFontFamily(doc) : "helvetica";

  renderReport(doc, item, fontFamily, {
    logoDataUrl: pdfOptions?.logoDataUrl,
    locale: pdfOptions?.locale,
    reportDate: pdfOptions?.reportDate,
    subscribed: pdfOptions?.subscribed,
  });

  const safeName = item.studentName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_");
  doc.save(`${safeName}_report.pdf`);
}

export async function exportBatchPDF(items: ReportItem[], pdfOptions?: PDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const allText = items.map((i) => [i.studentName, i.feedback || "", i.subject || ""].join("")).join("");
  const needCJK = hasCJK(allText) || pdfOptions?.locale?.startsWith("zh");
  if (needCJK) {
    await registerCJKFont(doc);
  }

  const fontFamily = needCJK ? getFontFamily(doc) : "helvetica";

  items.forEach((item, index) => {
    if (index > 0) doc.addPage();
    renderReport(doc, item, fontFamily, {
      indexLabel: `${index + 1} / ${items.length}`,
      logoDataUrl: pdfOptions?.logoDataUrl,
      locale: pdfOptions?.locale,
      reportDate: pdfOptions?.reportDate,
      subscribed: pdfOptions?.subscribed,
    });
  });

  doc.save(`batch-reports-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportClassDashboardPDF(options: ClassDashboardPDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerCJKFont(doc);
  const fontFamily = getFontFamily(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 18;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 34, pageWidth, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(16);
  doc.text(options.title, margin, y);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(new Date().toLocaleDateString(options.locale?.startsWith("zh") ? "zh-TW" : "en-US"), pageWidth - margin, y, { align: "right" });

  y = 46;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  wrapText(doc, options.subtitle, pageWidth - margin * 2).forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });

  y += 5;
  const metricWidth = (pageWidth - margin * 2 - 8) / 2;
  [
    ["已批改作文", String(options.essayCount)],
    ["平均分", `${options.averageScore}/100`],
  ].forEach(([label, value], index) => {
    const x = margin + index * (metricWidth + 8);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, metricWidth, 28, 3, 3, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8);
    doc.text(label, x + 5, y + 9);
    doc.setTextColor(15, 23, 42);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(17);
    doc.text(value, x + 5, y + 21);
  });

  y += 42;
  const drawSectionTitle = (title: string) => {
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, y - 4, 2, 6, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(12);
    doc.text(title, margin + 5, y);
    y += 8;
  };

  drawSectionTitle("全班共同語法錯誤排行榜");
  const maxError = Math.max(...options.grammarErrors.map((e) => e.value), 1);
  options.grammarErrors.slice(0, 6).forEach((item, index) => {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`${index + 1}. ${item.name}`, margin, y);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 58, y - 4, 92, 5, 1.5, 1.5, "F");
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin + 58, y - 4, Math.max(4, (item.value / maxError) * 92), 5, 1.5, 1.5, "F");
    doc.text(String(item.value), pageWidth - margin, y, { align: "right" });
    y += 8;
  });

  y += 6;
  drawSectionTitle("詞彙豐富度分佈圖");
  const maxVocab = Math.max(...options.vocabularyDistribution.map((v) => v.count), 1);
  options.vocabularyDistribution.forEach((item) => {
    doc.setTextColor(51, 65, 85);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.text(item.band, margin, y);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 28, y - 4, 120, 5, 1.5, 1.5, "F");
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + 28, y - 4, Math.max(4, (item.count / maxVocab) * 120), 5, 1.5, 1.5, "F");
    doc.text(`${item.count}`, pageWidth - margin, y, { align: "right" });
    y += 8;
  });

  y += 6;
  drawSectionTitle("預測 DSE 級別分佈");
  const maxLevel = Math.max(...options.dseLevelDistribution.map((d) => d.count), 1);
  options.dseLevelDistribution.forEach((item) => {
    doc.setTextColor(51, 65, 85);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.text(item.level, margin, y);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 28, y - 4, 120, 5, 1.5, 1.5, "F");
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(margin + 28, y - 4, Math.max(4, (item.count / maxLevel) * 120), 5, 1.5, 1.5, "F");
    doc.text(`${item.count}`, pageWidth - margin, y, { align: "right" });
    y += 8;
  });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("Generated by Compify.Pro — Class Analytics Dashboard", pageWidth / 2, 289, { align: "center" });
  doc.save(`class-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportInstitutionQuotationPDF(options: InstitutionQuotationPDFOptions = {}): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerCJKFont(doc);
  const fontFamily = getFontFamily(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const today = new Date().toLocaleDateString(options.locale?.startsWith("zh") ? "zh-TW" : "en-US");

  doc.setFillColor(...REPORT_PALETTE.navy);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setFillColor(...REPORT_PALETTE.green);
  doc.rect(0, 42, pageWidth, 1.5, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text("Compify.pro 校園 / 機構採購報價單", margin, 19);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Quotation Sample for School & Institutional Procurement", margin, 29);
  doc.text(`日期：${today}`, pageWidth - margin, 19, { align: "right" });

  let y = 56;
  drawSoftBox(doc, margin, y, pageWidth - margin * 2, 31);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...REPORT_PALETTE.ink);
  doc.text("採購摘要", margin + 6, y + 10);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  clippedLines(doc, "Compify.pro 為香港學校及補習機構提供 DSE/TSA 對標 AI 作文批改、全班數據看板、專業 PDF 報告及科組級別弱點分析，協助教師以更低行政成本交付具權威感的學生診斷報告。", pageWidth - margin * 2 - 12, 3).forEach((line, idx) => doc.text(line, margin + 6, y + 18 + idx * 4.6));

  y = 101;
  drawSectionHeading(doc, "一、建議採購方案", margin, y, fontFamily);
  y += 10;
  const rows = [
    ["個人教師 Pro 版", "HK$288 / 月", "個人使用；Beta 首 100 名 HK$168 / 月"],
    ["按量報告包", "HK$98", "10 份專業 AI 批改報告，適合試用或零散批改"],
    ["校園 / 機構版", "HK$688 / 月起", "最多 20 位教師；共享數據、統一評分及管理視圖"],
  ];
  const colX = [margin, margin + 50, margin + 87];
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...REPORT_PALETTE.blue);
  ["項目", "報價", "內容"].forEach((h, idx) => doc.text(h, colX[idx] + 3, y + 6.5));
  y += 12;
  rows.forEach((row, index) => {
    doc.setFillColor(index % 2 === 0 ? 248 : 255, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 15, 1.8, 1.8, "F");
    doc.setFont(fontFamily, index === 0 ? "bold" : "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(row[0], colX[0] + 3, y + 9);
    doc.setFont(fontFamily, "bold");
    doc.text(row[1], colX[1] + 3, y + 9);
    doc.setFont(fontFamily, "normal");
    clippedLines(doc, row[2], 80, 2).forEach((line, idx) => doc.text(line, colX[2] + 3, y + 6 + idx * 4.2));
    y += 17;
  });

  y += 10;
  drawSectionHeading(doc, "二、核心交付價值", margin, y, fontFamily);
  y += 10;
  [
    "全班作文批量上傳及自動批改，減少教師重複行政工作。",
    "每位學生可獲獨立 PDF 診斷報告，包含 DSE 模擬等級、能力雷達圖及改善策略。",
    "科組可查看共同語法錯誤、詞彙豐富度及預測級別分佈，方便向主任或校長匯報。",
    "Pro 版僅限個人使用；如需多人共用、跨 IP 或科組共享，建議採用校園 / 機構版。",
  ].forEach((point, idx) => {
    doc.setFillColor(idx === 3 ? 254 : 248, idx === 3 ? 243 : 250, idx === 3 ? 199 : 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 13, 2, 2, "F");
    doc.setFont(fontFamily, "bold");
    const accentColor = idx === 3 ? REPORT_PALETTE.amber : REPORT_PALETTE.green;
    doc.setTextColor(...accentColor);
    doc.text(`${idx + 1}`, margin + 5, y + 8.5);
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(51, 65, 85);
    clippedLines(doc, point, pageWidth - margin * 2 - 20, 2).forEach((line, lineIdx) => doc.text(line, margin + 14, y + 8 + lineIdx * 4.2));
    y += 17;
  });

  y += 7;
  drawSectionHeading(doc, "三、付款與採購備註", margin, y, fontFamily);
  y += 10;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  clippedLines(doc, "本文件為採購申請樣本，正式報價可按學校教師人數、每月作文量及私隱合規需求作最後確認。Beta 早鳥優惠只適用於首 100 名 Pro 用戶；正式標價保留為 HK$288 / 月，以維持產品長期服務質素及運算資源穩定。", pageWidth - margin * 2, 4).forEach((line, idx) => doc.text(line, margin, y + idx * 4.5));

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...REPORT_PALETTE.ink);
  doc.text("聯絡：admin@compify.pro", margin, 274);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...REPORT_PALETTE.muted);
  doc.text("Generated by Compify.pro — The Future of Hong Kong Education", pageWidth / 2, 288, { align: "center" });
  doc.save(`compify-institution-quotation-${new Date().toISOString().slice(0, 10)}.pdf`);
}
