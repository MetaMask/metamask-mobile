export interface AgenticCliDashboardWebviewParams {
  requestId: string;
  dashboardUrl: string;
  dashboardToken: string;
}

export type DashboardWebviewResult =
  | { type: 'approved'; cliToken: string }
  | { type: 'rejected'; message?: string }
  | { type: 'close'; message?: string }
  | { type: 'error'; message: string };

export const AGENTIC_CLI_DASHBOARD_MESSAGE_SOURCE = 'mm-agentic-cli' as const;
