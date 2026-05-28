export const TIERS = {
  free: {
    name: "Free",
    product_id: null,
    price_id: null,
    essayLimit: 5,
  },
  pro: {
    name: "Pro",
    product_id: "prod_UQ2biuiyyZvVtg",
    price_id: "price_1TRCWWFemBfoJidCCZUVhkFO",
    essayLimit: Infinity,
  },
  school: {
    name: "School",
    product_id: "prod_UFyqvv3GUa23DT",
    price_id: "price_1THSsUFemBfoJidCnkKNORfI",
    essayLimit: Infinity,
  },
} as const;

export const CREDIT_PACK = {
  name: "10 Report Credit Pack",
  product_id: "prod_UQ2ecGG80HeX2T",
  price_id: "price_1TRCZNFemBfoJidCEleDVn6b",
  reportCredits: 10,
} as const;

export type TierKey = keyof typeof TIERS;

const LEGACY_PRODUCT_TIERS: Record<string, TierKey> = {
  prod_UFyp0kzskPOqJm: "pro",
};

export function getTierByProductId(productId: string | null): TierKey {
  if (!productId) return "free";
  if (LEGACY_PRODUCT_TIERS[productId]) return LEGACY_PRODUCT_TIERS[productId];
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return "free";
}
