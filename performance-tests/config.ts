// config.ts
import { Options } from "k6/options";

// Base API URL (pointing to your mock API)
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Auth token injected via environment variable
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "dummy-token";

// CSV path injected via environment variable
const CSV_PATH = __ENV.CSV_PATH || "./data/objects.csv";

// Think time (seconds) between iterations
const THINK_TIME = Number(__ENV.THINK_TIME) || 1;

// Load stages for Phase 2 (ramp-up, hold, ramp-down)
const LOAD_STAGES = [
  { duration: "10s", target: 10 },  // ramp-up to 10 VUs
  { duration: "30s", target: 10 },   // hold steady
  { duration: "10s", target: 0 },   // ramp-down
];

// Thresholds
const THRESHOLDS = {
  http_req_duration: ["p(95)<500"], // 95% of requests under 500ms
  checks: ["rate>0.99"],            // at least 99% checks must pass
  "check_failure_rate": ["rate<0.01"], // custom metric threshold
};

// Exported config object
export const config = {
  BASE_URL,
  AUTH_TOKEN,
  CSV_PATH,
  THINK_TIME,
  LOAD_STAGES,
  THRESHOLDS,
};

// Export k6 options (scenarios defined in main.ts)
export const options: Options = {
  thresholds: THRESHOLDS,
  // 👇 Add this block to include p99 in the summary
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  scenarios: {
    phase1_seeding: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1000, // will be driven by CSV rows
      gracefulStop: "10s",
	  exec: "phase1_seeding",
    },
    phase2_load: {
      executor: "ramping-vus",
      startTime: "10s",       // wait until seeding is done
      stages: LOAD_STAGES,
      gracefulRampDown: "10s",
	  exec: "phase2_load",
    },
  },
};