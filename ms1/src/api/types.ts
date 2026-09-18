export type RequestStatus =
  | "draft"
  | "pending_info"
  | "pending_approval"
  | "approved"
  | "escalated"
  | "done";

export interface Approval {
  id: string;
  approverRole: string;
  decision: "pending" | "approved" | "rejected";
  decidedAt: string | null;
  reason: string | null;
}

export interface AgentLog {
  id: string;
  requestId?: string | null;
  nodeName: string;
  toolCalled: string | null;
  reasoning: string;
  result: Record<string, unknown>;
  timestamp: string;
}

export interface OnboardingRequest {
  id: string;
  employeeName: string;
  type: string;
  status: RequestStatus;
  department: string;
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  latestApproval: Approval | null;
  latestLog: AgentLog | null;
}
