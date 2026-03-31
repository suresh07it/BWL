export type TaskMetadata = {
  participant: string;
  businessOwners: string[];
  experts: string[];
  systems: string[];
  dueDate: string;
  cycleTimeValue: string;
  cycleTimeUnit: string;
  waitTimeValue: string;
  waitTimeUnit: string;
};

export type DiagramMetadataDoc = {
  tasks: Record<string, TaskMetadata>;
};

export const emptyTaskMetadata = (): TaskMetadata => ({
  participant: "",
  businessOwners: [],
  experts: [],
  systems: [],
  dueDate: "",
  cycleTimeValue: "",
  cycleTimeUnit: "Days",
  waitTimeValue: "",
  waitTimeUnit: "Days"
});

export const emptyMetadataDoc = (): DiagramMetadataDoc => ({ tasks: {} });

