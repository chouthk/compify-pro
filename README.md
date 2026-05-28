# Compify.Pro — AI Essay Grading for Hong Kong Teachers

AI 作文批改平台，專為香港小學及中學教師設計。支援 DSE、TSA、小學中文、小學英文等評分標準。

## 🚀 Deploy 指南

### Frontend (Vercel)
1. 去 https://vercel.com 用 GitHub 登入
2. Import `chouthk/compify-pro` repo
3. Framework Preset: Vite（或自動 detect）
4. Vercel 會自動用 `vercel.json` 設定，直接 Deploy
5. Deploy 後設定 Custom Domain：compify.pro

### Backend (Supabase Edge Functions)
Edge functions 需要喺 Supabase dashboard 設定 Secrets：
1. 去 Supabase Dashboard → Edge Functions → 揀每個 function → Secrets
2. Add 以下環境變數：
   - `SUPABASE_URL` — 你的 Supabase project URL
   - `SUPABASE_ANON_KEY` — 你的 Supabase anon key
   - `DEEPSEEK_API_KEY` — 你的 DeepSeek API key (recommended)
   - `AI_PROVIDER` — 設為 `deepseek`
   - `DEEPSEEK_MODEL` — `deepseek-chat`

### DeepSeek API Key 申請
1. 去 https://platform.deepseek.com 註冊賬號
2. 充值（建議先充 ¥20 試用）
3. 喺 API Keys 頁面生成 Key
4. Copy 去 Supabase Secrets：`DEEPSEEK_API_KEY`

DeepSeek 收費約 ¥0.5 / 百萬 tokens（輸入）+ ¥2 / 百萬 tokens（輸出）
Compare: OpenAI GPT-4o 約 US$2.5~10 / 百萬 tokens

## 🏫 支援評分標準
- DSE 中文（內容40/表達30/結構20/標點字體10）
- DSE English (Content 7/Language 7/Organization 7)
- 小學中文（內容40/詞語20/句子20/結構10/標點10）
- 小學英文 (Content 20/Vocabulary 25/Grammar 25/Organization 15/Mechanics 15)
- TSA 中文（內容40/詞句30/結構15/標點字體15）
- TSA English (Content30/Lang&Grammar35/Organization20/Presentation15)
- IB, IELTS, TOEFL, Custom
