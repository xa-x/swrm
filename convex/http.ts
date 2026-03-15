import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixSignature = request.headers.get("svix-signature");
    const svixTimestamp = request.headers.get("svix-timestamp");

    if (!svixId || !svixSignature || !svixTimestamp) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const wh = new Webhook(webhookSecret);
    let event: any;

    try {
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-signature": svixSignature,
        "svix-timestamp": svixTimestamp,
      });
    } catch (err) {
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = event.type;
    const data = event.data;

    if (eventType === "user.created" || eventType === "user.updated") {
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
      const plan = data.public_metadata?.plan ?? "free";

      await ctx.runMutation(api.users.upsertFromClerk, {
        userId,
        email,
        name,
        plan,
      });
    }

    if (eventType.startsWith("billing.subscription.")) {
      const userId = data.app_user_id || data.clerk_user_id;
      
      let plan = "free";
      
      if (eventType === "billing.subscription.created" || 
          eventType === "billing.subscription.updated" ||
          eventType === "billing.subscription.active") {
        plan = mapPriceToPlan(data.price_id || data.plan_id);
      }

      await ctx.runMutation(api.users.updatePlan, {
        userId,
        plan,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

function mapPriceToPlan(priceId: string): string {
  if (priceId?.includes('basic')) return 'basic';
  if (priceId?.includes('pro')) return 'pro';
  if (priceId?.includes('team')) return 'team';
  return 'free';
}

export default http;
