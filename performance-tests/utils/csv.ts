export interface CsvRow {
  name: string;
  data: { value: number };
}

export function loadCsv(path: string): CsvRow[] {
  const text = open(path); // built-in k6 open()
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, unknown> = {};

    headers.forEach((h, i) => {
      const raw: unknown = values[i];
      if (typeof raw === "string") {
        row[h.trim()] = raw.trim();
      } else {
        throw new Error(`Unexpected type for column ${h}`);
      }
    });

    return {
      name: row["name"] as string,
      data: { value: Number(row["value"]) },
    };
  });
}