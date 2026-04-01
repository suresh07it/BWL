import type { DiagramMetadataDoc } from "../types/metadata";

const API_BASE = "http://localhost:8081/api";

export type VersionSummary = {
  versionNumber: number;
  current: boolean;
  createdAt: string;
  author: string;
};

export type SnapshotResponse = {
  processId: string;
  versionNumber: number;
  current: boolean;
  createdAt: string;
  author: string;
  bpmnXml: string;
  taskMetadata: DiagramMetadataDoc;
};

export async function listProcessVersions(processId: string): Promise<VersionSummary[]> {
  const res = await fetch(`${API_BASE}/processes/${encodeURIComponent(processId)}/versions`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getProcessVersion(processId: string, versionNumber: number): Promise<SnapshotResponse | null> {
  const res = await fetch(`${API_BASE}/processes/${encodeURIComponent(processId)}/versions/${encodeURIComponent(String(versionNumber))}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function createProcessVersion(processId: string, bpmnXml: string, taskMetadata: DiagramMetadataDoc, author: string): Promise<SnapshotResponse | null> {
  const res = await fetch(`${API_BASE}/processes/${encodeURIComponent(processId)}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bpmnXml, taskMetadata, author })
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function exportProcessVersionPdf(processId: string, versionNumber: number, svg: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/processes/${encodeURIComponent(processId)}/versions/${encodeURIComponent(String(versionNumber))}/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ svg })
  });
  if (!res.ok) return null;
  return await res.blob();
}
