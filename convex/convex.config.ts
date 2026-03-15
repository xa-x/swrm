// convex/convex.config.ts
import actionCache from "@convex-dev/action-cache/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

app.use(rateLimiter);
app.use(crons);
app.use(actionCache);
app.use(pushNotifications);

export default app;
