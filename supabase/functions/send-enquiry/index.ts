import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, position, monthly_volume } = await req.json();

    if (!name || !email || !position || !monthly_volume) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to Make.com webhook
    const webhookPromise = fetch("https://hook.eu2.make.com/grkuguevd04e1l77agrkxgofoadh2u0k", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, position, monthly_volume }),
    });

    // Send email notification to admin via a simple email (using Make.com or direct)
    // For now, we include admin email in the webhook payload so Make.com can route it
    const adminNotifyPromise = fetch("https://hook.eu2.make.com/grkuguevd04e1l77agrkxgofoadh2u0k", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        position,
        monthly_volume,
        notify_admin: true,
        admin_email: "admin@compify.pro",
        subject: `New Enquiry from ${name} (${position})`,
        message: `Name: ${name}\nEmail: ${email}\nPosition: ${position}\nMonthly Volume: ${monthly_volume}`,
      }),
    });

    await Promise.all([webhookPromise, adminNotifyPromise]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
