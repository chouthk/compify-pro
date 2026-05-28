import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_PACK_PRICE_ID = "price_1TRCZNFemBfoJidCEleDVn6b";
const CREDIT_PACK_AMOUNT = 10;

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CLAIM-REPORT-CREDITS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return new Response(JSON.stringify({ error: "Valid sessionId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });

    if (session.payment_status !== "paid") throw new Error("Payment is not completed");
    if (session.mode !== "payment") throw new Error("Checkout session is not a one-time payment");
    if (session.customer_email && session.customer_email !== user.email) throw new Error("Checkout email does not match current user");

    const hasCreditPack = session.line_items?.data.some((item) => item.price?.id === CREDIT_PACK_PRICE_ID);
    if (!hasCreditPack) throw new Error("Checkout session does not contain the report credit pack");

    const { error: insertError } = await supabaseClient
      .from("report_credit_transactions")
      .insert({
        user_id: user.id,
        credits: CREDIT_PACK_AMOUNT,
        reason: "credit_pack_purchase",
        stripe_session_id: session.id,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        logStep("Credit pack already claimed", { sessionId });
      } else {
        throw insertError;
      }
    } else {
      logStep("Credit pack claimed", { userId: user.id, sessionId, credits: CREDIT_PACK_AMOUNT });
    }

    const { data: balance } = await supabaseClient.rpc("get_report_credit_balance", { _user_id: user.id });

    return new Response(JSON.stringify({ creditsAdded: CREDIT_PACK_AMOUNT, balance: balance ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
