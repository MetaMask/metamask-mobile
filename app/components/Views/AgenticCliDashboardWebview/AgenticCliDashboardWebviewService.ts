import NavigationService from '../../../core/NavigationService';
import Routes from '../../../constants/navigation/Routes';
import {
  AGENTIC_CLI_DASHBOARD_MESSAGE_SOURCE,
  type AgenticCliDashboardWebviewParams,
  type DashboardWebviewResult,
} from './types';

const MAX_MESSAGE_LENGTH = 16 * 1024;
const WEBVIEW_TIMEOUT_MS = 5 * 60 * 1000;

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/dashboard\.w3a\.io$/,
  /^https:\/\/test-dashboard\.web3auth\.io$/,
  /^https:\/\/dev-dashboard\.web3auth\.io$/,
  /^https:\/\/auth\.web3auth\.io$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
  /^http:\/\/10\.0\.2\.2(?::\d+)?$/,
  /^http:\/\/localhost(?::\d+)?$/,
];

interface PendingRequest {
  resolve: (cliToken: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();

const createRequestId = (): string =>
  `agentic-cli-dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeToken = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;

const completeRequest = (
  requestId: string,
  action: (pending: PendingRequest) => void,
): void => {
  const pending = pendingRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeoutId);
  pendingRequests.delete(requestId);
  action(pending);
};

export const AgenticCliDashboardWebviewService = {
  buildWebViewUrl(dashboardUrl: string, dashboardToken: string): string {
    const url = new URL(dashboardUrl);

    const origin = `${url.protocol}//${url.host}`;

    if (!AgenticCliDashboardWebviewService.isOriginAllowed(origin)) {
      throw new Error('Dashboard origin is not allowed');
    }

    url.searchParams.delete('auth_token');
    const hashParams = new URLSearchParams(url.hash.slice(1));
    hashParams.set('auth_token', dashboardToken);
    url.hash = hashParams.toString();
    return url.toString();
  },

  isOriginAllowed(origin: string): boolean {
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  },

  shouldLoadInWebView(url: string): boolean {
    try {
      const parsed = new URL(url);
      return AgenticCliDashboardWebviewService.isOriginAllowed(
        `${parsed.protocol}//${parsed.host}`,
      );
    } catch {
      return false;
    }
  },

  parseEvent(raw: unknown): DashboardWebviewResult | null {
    if (typeof raw !== 'string') return null;
    if (raw.length > MAX_MESSAGE_LENGTH) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cliToken = normalizeToken(raw);
      return cliToken ? { type: 'approved', cliToken } : null;
    }

    if (!parsed || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;
    const payload = asRecord(obj.payload);
    const source = obj.source;
    if (
      source !== undefined &&
      source !== AGENTIC_CLI_DASHBOARD_MESSAGE_SOURCE
    ) {
      return null;
    }

    const type = typeof obj.type === 'string' ? obj.type : 'approved';
    const cliToken = payload ? JSON.stringify(payload) : '';

    switch (type) {
      case 'CLI_AUTH_TOKEN':
      case 'approved':
      case 'approve':
      case 'success':
        return cliToken ? { type: 'approved', cliToken } : null;
      case 'rejected':
      case 'reject':
      case 'denied':
      case 'deny':
        return {
          type: 'rejected',
          message:
            typeof obj.message === 'string' ? obj.message : 'Request rejected',
        };
      case 'close':
        return {
          type: 'close',
          message:
            typeof obj.message === 'string' ? obj.message : 'WebView closed',
        };
      case 'error':
        return {
          type: 'error',
          message:
            typeof obj.message === 'string' ? obj.message : 'Unknown error',
        };
      default:
        return null;
    }
  },

  open(
    params: Omit<AgenticCliDashboardWebviewParams, 'requestId'>,
  ): Promise<string> {
    const requestId = createRequestId();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Dashboard approval timed out.'));
      }, WEBVIEW_TIMEOUT_MS);

      pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      try {
        NavigationService.navigation.navigate(
          Routes.AGENTIC_CLI_DASHBOARD_WEBVIEW.CONFIRM,
          {
            ...params,
            requestId,
          },
        );
      } catch (error) {
        completeRequest(requestId, (pending) =>
          pending.reject(
            error instanceof Error ? error : new Error(String(error)),
          ),
        );
      }
    });
  },

  resolve(requestId: string, cliToken: string): void {
    completeRequest(requestId, (pending) => pending.resolve(cliToken));
  },

  reject(requestId: string, error: Error): void {
    completeRequest(requestId, (pending) => pending.reject(error));
  },
};
