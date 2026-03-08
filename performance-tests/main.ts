import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import http from "k6/http";
import { check, sleep, group } from "k6";
import { SharedArray } from "k6/data";
import { options, config } from "./config.ts";
import { loadCsv, CsvRow } from "./utils/csv.ts";
import { Rate } from "k6/metrics";
import { Client } from "k6/x/redis";  //Redis extension

export { options };

// ---- Interfaces ----
interface PostResponse {
  id: number;
  name: string;
  data: { value: number };
}

interface PatchPayload {
  name: string;
  data: { value: number };
}

// ---- Custom Metric ----
const checkFailureRate = new Rate("check_failure_rate");

// ---- Redis Client ----
const client = new Client("redis://localhost:6379");


// ---- SharedArray for CSV rows ----
const csvRows: CsvRow[] = new SharedArray("csv-data", () => loadCsv(config.CSV_PATH));


// --------------------
// Phase 1: Seeding
// --------------------

export function phase1_seeding() {
  // ✅ Clear out old IDs before seeding
  if (__ITER == 0) {
    client.del("seeded_ids");
  }
  group("Phase 1 - Seeding", () => {


    const row = csvRows[__ITER];
    const payload = JSON.stringify(row);

    const res = http.post(`${config.BASE_URL}/objects`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.AUTH_TOKEN}`,
      },
      tags: { phase: "seeding", request: "POST" },
    });

    console.log(`Phae-1 - Seeding phase response for Payload: ${payload} is : ${res.body}`);
    const ok = check(res, {
      "status is 201": (r) => r.status === 201,
      "body not empty": (r) => r.body.length > 0,
      "name matches": (r) => (JSON.parse(r.body) as PostResponse).name === row.name,
    });

    if (!ok) checkFailureRate.add(1);

    const obj = JSON.parse(res.body) as PostResponse;
     // Push ID into Redis list
    client.rpush("seeded_ids", obj.id.toString());
    console.log(`Seeded ID ${obj.id} pushed to Redis`);

  });
}

// --------------------
// Phase 2: Load
// --------------------
export function phase2_load() {
  group("Phase 2 - Load", () => {
    client.lrange("seeded_ids", 0, -1).then((seededIds: string[]) => {
      if (!seededIds || seededIds.length === 0) {
        console.error("No seeded IDs available");
        return;
      }

    const id = seededIds[Math.floor(Math.random() * seededIds.length)];
    const payload: PatchPayload = {
      name: `Updated-${Math.floor(Math.random() * 1000)}`,
      data: { value: Math.floor(Math.random() * 1000) },
    };

    const res = http.patch(`${config.BASE_URL}/objects/${id}`, JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.AUTH_TOKEN}`,
      },
      tags: { phase: "load", request: "PATCH" },
    });

    console.log(`Phase-2 - Load phase response for PatchPayload: ${JSON.stringify(payload)} is : ${res.body}`);

      const ok = check(res, {
        "status is 200": (r) => r.status === 200,
        "body not empty": (r) => r.body.length > 0,
        "id matches": (r) => (JSON.parse(r.body) as PostResponse).id === Number(id),
      });


    if (!ok) checkFailureRate.add(1);

    sleep(config.THINK_TIME);
    });
  });
}


export function handleSummary(data: any) {
  // Core metrics
  const totalRequests = data.metrics.http_reqs?.values?.count ?? 0;
  const errorCount = data.metrics.http_req_failed?.values?.count ?? 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate ?? 0;

  // Latency percentiles (from .values)
  const httpDuration = data.metrics.http_req_duration?.values || {};
  const p50 = httpDuration.med ?? null;   // median ~ p50
  const p90 = httpDuration["p(90)"] ?? null;
  const p95 = httpDuration["p(95)"] ?? null;
  const p99 = httpDuration["p(99)"] ?? null; // only if summaryTrendStats includes p99

  // Threshold verdicts
  const thresholds: Record<string, string> = {};
  if (data.metrics) {
    for (const [metric, metricData] of Object.entries(data.metrics)) {
      if ((metricData as any).thresholds) {
        const verdicts = (metricData as any).thresholds;
        thresholds[metric] = Object.values(verdicts).every((v: any) => v.ok) ? "PASS" : "FAIL";
      }
    }
  }

  const summary = {
    totalRequests,
    errorCount,
    errorRate,
    latency: { p50, p90, p95, p99 },
    thresholds,
  };

  return {
    "summary.json": JSON.stringify(summary, null, 2),
    "summary.html": htmlReport(data), // generates a full HTML report
  };
}