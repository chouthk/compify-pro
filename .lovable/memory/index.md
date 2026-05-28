# Project Memory

## Core
Notion/Linear-inspired design. Plus Jakarta Sans headings, Inter body. HSL tokens only.
Multi-language: EN, zh-TW, zh-CN via react-i18next. All UI strings use t() keys.
Lovable Cloud enabled. Stripe enabled. Profiles table with auto-create trigger.
Logo uses src/assets/compify-logo.png via shared Logo component.

## Memories
- [i18n setup](mem://features/i18n) — react-i18next with EN/zh-TW/zh-CN, localStorage persistence, navbar switcher
- [Auth system](mem://features/auth) — Supabase auth with profiles table, login/signup/forgot/reset pages, AuthContext provider
- [Stripe subscriptions](mem://features/stripe) — Free/Pro/School tiers, checkout/check-subscription/customer-portal edge functions
- [AI grading](mem://features/grading) — grade-essay edge function with tiered feedback (weak/avg/strong), AI rewriting suggestions, AI detection, rubric presets
- [Exemplars](mem://features/exemplars) — exemplar_essays table, /exemplars page for model essay bank with filtering
- [Teaching resources](mem://features/teaching-resources) — generate-teaching-resource edge function, Analytics teaching tab
