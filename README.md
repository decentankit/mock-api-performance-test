# Mock API + k6 Performance Testing Suite

This project implements a mock API backend and a performance testing suite using **k6** with TypeScript.  
It demonstrates a two‑phase workflow:

- **Phase‑1**: Seeding data (creating objects/IDs).  
- **Phase‑2**: Load testing using the seeded IDs.

---

## 📂 Repository Structure

```
mock-api/                # Express mock API server
  ├── tsconfig.json      # TypeScript configuration
  ├── package.json       # Dependencies and scripts
  └── src/
      └── server.ts      # Entry point for Express mock API server

performance-tests/       # k6 scripts and configs
  ├── config.ts          # Scenario configuration
  ├── main.ts            # Entry point for running tests
  ├── seeded_ids.json    # Example seeded data (for illustration)
  └── summary.json       # Test output (ignored in .gitignore)
```

---

## ⚙️ Requirements

- Node.js (for mock API)  
- k6 (for performance testing)  
- Redis (used for persisting IDs between phases)  

---

## 🚀 Setup Instructions

```bash
# Install dependencies
npm install

# Start mock API
npx ts-node src/server.ts

# Run performance tests (single command for both phases)
k6 run -e AUTH_TOKEN=<token> -e CSV_PATH=./data/objects.csv performance-tests/main.ts
```

---

## 🛠️ Implementation Details

- **Phase‑1**: Seeds data by creating objects/IDs.  
- **Phase‑2**: Load tests using the seeded IDs.  
- **Persistence**: IDs generated in Phase‑1 are stored in Redis. Phase‑2 fetches them back to ensure all VUs can share the same dataset.  

### SharedArray Limitation
- `SharedArray` must be initialized in the **init context** (top‑level of the script).  
- Since Phase‑1 generates IDs dynamically, they are not available at init time.  
- To solve this, Redis is used as a persistence layer.  

### Alternative Approach
- One way to use `SharedArray` would be to execute Phase‑1 and Phase‑2 separately.  
- Phase‑1 generates IDs and stores them in Redis or a CSV/JSON file.  
- Phase‑2 initializes `SharedArray` at startup by loading those IDs.  
- However, this violates the requirement that *“The solution must be runnable with a single command.”*

---

## ▶️ How to Run Both Phases

- Run `main.ts` with k6 as shown above.  
- Both phases execute in sequence with a single command.  
- Redis ensures Phase‑2 can consume Phase‑1 data across VUs.  

---

## 📌 Notes & Trade‑offs

- Redis was chosen for persistence because it is realistic, scalable, and easy to integrate.  
- SharedArray could not be used directly with Phase‑1 generated data due to k6’s init context restriction.  

---

## 👤 Author

**Ankit Jain**  
Senior Performance Tester & Automation Architect