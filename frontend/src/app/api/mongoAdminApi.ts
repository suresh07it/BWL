const API_BASE = "http://localhost:8081/api";

export async function listMongoCollections(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/admin/mongo/collections`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
}

export async function listMongoDocuments(collection: string, skip: number, limit: number): Promise<unknown[]> {
  const res = await fetch(
    `${API_BASE}/admin/mongo/collections/${encodeURIComponent(collection)}?skip=${encodeURIComponent(String(skip))}&limit=${encodeURIComponent(String(limit))}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
