import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old usage records weekly (Sunday at 3am UTC)
crons.interval(
  "cleanup-old-usage",
  { hours: 168 }, // Weekly
  internal.crons.cleanupOldUsage
);

export default crons;
