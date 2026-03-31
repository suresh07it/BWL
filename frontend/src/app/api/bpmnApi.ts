import type { DiagramMetadataDoc, TaskMetadata } from "../types/metadata";
import { emptyMetadataDoc, emptyTaskMetadata } from "../types/metadata";

const API_BASE = "http://localhost:8081/api";

export type SpaceSummaryDto = {
  id: string;
  name: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  items: number;
};

export type ProcessBlueprintDto = {
  id: string;
  name: string;
  fileName: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
};

export async function listSpaces(): Promise<SpaceSummaryDto[]> {
  const res = await fetch(`${API_BASE}/library/spaces`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function listProcesses(spaceId: string): Promise<ProcessBlueprintDto[]> {
  const res = await fetch(`${API_BASE}/library/spaces/${encodeURIComponent(spaceId)}/processes`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createProcess(spaceId: string, name: string): Promise<ProcessBlueprintDto | null> {
  const res = await fetch(`${API_BASE}/library/spaces/${encodeURIComponent(spaceId)}/processes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function listDiagrams(spaceName: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getDiagramXml(spaceName: string, fileName: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams/${encodeURIComponent(fileName)}`);
  if (!res.ok) return null;
  return await res.text();
}

export async function saveDiagramXml(spaceName: string, fileName: string, xml: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams/${encodeURIComponent(fileName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml
  });
  return res.ok;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

const normalizeTaskMetadata = (v: unknown): TaskMetadata => {
  if (!isRecord(v)) return emptyTaskMetadata();
  return {
    participant: typeof v.participant === "string" ? v.participant : "",
    businessOwners: isStringArray(v.businessOwners) ? v.businessOwners : [],
    experts: isStringArray(v.experts) ? v.experts : [],
    systems: isStringArray(v.systems) ? v.systems : [],
    dueDate: typeof v.dueDate === "string" ? v.dueDate : "",
    cycleTimeValue: typeof v.cycleTimeValue === "string" ? v.cycleTimeValue : "",
    cycleTimeUnit: typeof v.cycleTimeUnit === "string" ? v.cycleTimeUnit : "Days",
    waitTimeValue: typeof v.waitTimeValue === "string" ? v.waitTimeValue : "",
    waitTimeUnit: typeof v.waitTimeUnit === "string" ? v.waitTimeUnit : "Days"
  };
};

const normalizeMetadataDoc = (v: unknown): DiagramMetadataDoc => {
  if (!isRecord(v) || !isRecord(v.tasks)) return emptyMetadataDoc();
  const tasks: Record<string, TaskMetadata> = {};
  for (const [k, value] of Object.entries(v.tasks)) {
    tasks[k] = normalizeTaskMetadata(value);
  }
  return { tasks };
};

export async function getDiagramMetadata(spaceName: string, fileName: string): Promise<DiagramMetadataDoc> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams/${encodeURIComponent(fileName)}/metadata`);
  if (!res.ok) return emptyMetadataDoc();
  try {
    const data = await res.json();
    return normalizeMetadataDoc(data);
  } catch {
    return emptyMetadataDoc();
  }
}

export async function saveDiagramMetadata(spaceName: string, fileName: string, metadata: DiagramMetadataDoc): Promise<DiagramMetadataDoc> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams/${encodeURIComponent(fileName)}/metadata`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata ?? emptyMetadataDoc())
  });
  if (!res.ok) return metadata ?? emptyMetadataDoc();
  try {
    const data = await res.json();
    return normalizeMetadataDoc(data);
  } catch {
    return metadata ?? emptyMetadataDoc();
  }
}

export async function exportDiagramPdf(spaceName: string, fileName: string, svg: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/spaces/${encodeURIComponent(spaceName)}/diagrams/${encodeURIComponent(fileName)}/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ svg })
  });
  if (!res.ok) return null;
  return await res.blob();
}
