export type EditorMode = "EDIT" | "VIEW";

export type DetailsTab = "Details" | "Problems" | "Policies" | "Documentation" | "Attachments" | "Comments";

import type { DiagramMetadataDoc, TaskMetadata } from "../types/metadata";
import { emptyMetadataDoc, emptyTaskMetadata } from "../types/metadata";

export type { DiagramMetadataDoc, TaskMetadata };
export { emptyMetadataDoc, emptyTaskMetadata };

const parseList = (value: any): string[] => {
  if (typeof value !== "string") return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
};

export const metadataFromBo = (bo: any): TaskMetadata => {
  const m = emptyTaskMetadata();
  if (!bo) return m;
  return {
    participant: bo.participant ?? "",
    businessOwners: parseList(bo.businessOwners),
    experts: parseList(bo.experts),
    systems: parseList(bo.systems),
    dueDate: bo.dueDate ?? "",
    cycleTimeValue: bo.cycleTimeValue ?? "",
    cycleTimeUnit: bo.cycleTimeUnit ?? "Days",
    waitTimeValue: bo.waitTimeValue ?? "",
    waitTimeUnit: bo.waitTimeUnit ?? "Days"
  };
};

export const metadataToProperties = (m: TaskMetadata): Record<string, any> => {
  const join = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean).join(", ");
  return {
    participant: m.participant,
    businessOwners: join(m.businessOwners),
    experts: join(m.experts),
    systems: join(m.systems),
    dueDate: m.dueDate,
    cycleTimeValue: m.cycleTimeValue,
    cycleTimeUnit: m.cycleTimeUnit,
    waitTimeValue: m.waitTimeValue,
    waitTimeUnit: m.waitTimeUnit
  };
};
