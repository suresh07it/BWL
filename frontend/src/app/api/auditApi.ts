const API_BASE = "http://localhost:8081/api";

export type AuditEvent = {
  id: string;
  spaceId: string;
  processId: string | null;
  action: string;
  actor: string;
  at: string;
  details: Record<string, unknown> | null;
};

export async function listRecentAuditEvents(): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/audit/events`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function listAuditEventsBySpace(spaceId: string): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/audit/spaces/${encodeURIComponent(spaceId)}/events`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
