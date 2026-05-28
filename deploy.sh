#!/bin/bash
# ============================================
# Compify.Pro Deploy Script
# 用法: bash deploy.sh
# 需要: SUPABASE_ACCESS_TOKEN (PAT from Supabase)
# ============================================

set -e

SUPABASE_PROJECT="oewddvucpszoqbkwuksf"

echo "🔍 Checking Supabase Access Token..."
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ 請設定 SUPABASE_ACCESS_TOKEN"
  echo "   去 https://supabase.com/dashboard/account/tokens 生成"
  exit 1
fi

echo "🔍 Checking DeepSeek API Key..."
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "⚠️  DEEPSEEK_API_KEY 未設定，將用 Supabase 已存嘅 key"
fi

echo ""
echo "🚀 Deploying Edge Functions..."

for func in grade-essay generate-exemplar generate-teaching-resource extract-text; do
  echo "  📦 Deploying $func..."
  npx supabase functions deploy $func --project-ref $SUPABASE_PROJECT --token $SUPABASE_ACCESS_TOKEN
  echo "  ✅ $func deployed"
done

echo ""
echo "🔐 Setting Secrets..."
SECRETS="AI_PROVIDER=deepseek,DEEPSEEK_MODEL=deepseek-chat"
if [ ! -z "$DEEPSEEK_API_KEY" ]; then
  SECRETS="$SECRETS,DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY"
fi
npx supabase secrets set --project-ref $SUPABASE_PROJECT --token $SUPABASE_ACCESS_TOKEN $SECRETS

echo ""
echo "✅ Done! All Edge Functions deployed."
