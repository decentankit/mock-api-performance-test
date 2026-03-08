import http from "k6/http";
import { check, sleep } from "k6";
import { options } from "./config.ts";

export { options };

let seededIds: number[] = [];

// --------------------
// Phase 1: Seeding
// --------------------
export function phase1_seeding() {
  const payload = JSON.stringify({
    name: `Seed-${__ITER}`,
    data: { value: __ITER },
  });

  const res = http.post("http://localhost:3000/objects", payload, {
    headers: { "Content-Type": "application/json" },
  });

  const ok = check(res, { "status is 201": (r) => r.status === 201 });
  if (ok) {
    const obj = JSON.parse(res.body);
    console.log(`Seeded object with id=${obj.id}`);
    seededIds.push(obj.id);
  }
}

// --------------------
// Phase 2: Load
// --------------------
export function phase2_load() {
  if (seededIds.length === 0) {
    console.error("No seeded IDs available");
    return;
  }

  const id = seededIds[Math.floor(Math.random() * seededIds.length)];
  const payload = JSON.stringify({
    name: `Updated-${Math.floor(Math.random() * 1000)}`,
    data: { value: Math.random() * 100 },
  });

  const res = http.patch(`http://localhost:3000/objects/${id}`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}