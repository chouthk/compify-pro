
## 階段 1：AI 批改增強（分層回饋 + AI 改寫建議 + AI 偵測）
修改 `grade-essay` edge function，加入：
- **分層回饋**：根據學生程度（弱/中/強）自動調整評語風格與深度
- **AI 改寫示範**：在反饋中加入具體的改寫建議段落
- **AI 代寫偵測**：在批改結果中加入「疑似 AI 代寫」風險指標
- 更新 GradeEssay 頁面 UI 顯示新增的回饋欄位

## 階段 2：備課資源自動生成
在 Analytics 頁面加入「生成教學資源」按鈕：
- 根據班級常見錯誤，呼叫 AI 生成課堂練習或易錯字詞筆記
- 新增 edge function `generate-teaching-resource`
- 支援下載為 PDF

## 階段 3：範文數據庫
- 新建 `exemplar_essays` 資料表（含 RLS）
- 老師可將高分作文匿名加入範文庫
- 新頁面 `/exemplars` 瀏覽和搜索範文
- 按年級、科目、分數篩選

## 階段 4：原文標註互動（Inline Annotation）
- 在批改結果頁加入可視化標註 UI
- AI 回饋結構化：將錯誤對應到原文位置
- 點擊標註可展開詳細說明

## 階段 5：Google Classroom 同步
- 連接 Google OAuth
- 支援匯出成績至 Google Classroom
- 需要額外的 connector 設定

---
**建議**：先從階段 1 開始，因為它直接提升核心批改品質，且改動集中在現有代碼上。
