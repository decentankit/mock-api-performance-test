import express, { Request, Response } from "express";
import bodyParser from "body-parser";

interface ObjectPayload {
  name: string;
  data: {
    [key: string]: any;
  };
}

interface StoredObject extends ObjectPayload {
  id: number;
}

const app = express();
app.use(bodyParser.json());

let objects: Record<number, StoredObject> = {};
let idCounter = 1;

// POST /objects - create new object
app.post("/objects", (req: Request, res: Response) => {
  const payload: ObjectPayload = req.body;
  const id = idCounter++;
  const newObj: StoredObject = { id, ...payload };
  objects[id] = newObj;
  res.status(201).json(newObj);
});

// GET /objects/:id
app.get("/objects/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);  // <-- cast to string
  const obj = objects[id];
  if (!obj) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(obj);
});

// PATCH /objects/:id
app.patch("/objects/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);  // <-- cast to string
  const existing = objects[id];
  if (!existing) {
    return res.status(404).json({ error: "Not found" });
  }
  const updated: StoredObject = { ...existing, ...req.body, id };
  objects[id] = updated;
  res.json(updated);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`);
});