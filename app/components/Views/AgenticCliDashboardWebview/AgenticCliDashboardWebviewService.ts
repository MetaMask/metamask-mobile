import NavigationService from '../../../core/NavigationService';
import Routes from '../../../constants/navigation/Routes';
import {
  AGENTIC_CLI_DASHBOARD_MESSAGE_SOURCE,
  type AgenticCliDashboardWebviewParams,
  type DashboardWebviewResult,
} from './types';
import { getBuildType } from '../../../core/OAuthService/OAuthLoginHandlers/constants';

const MAX_MESSAGE_LENGTH = 16 * 1024;
const WEBVIEW_TIMEOUT_MS = 5 * 60 * 1000;

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/dashboard\.w3a\.io$/,
  /^https:\/\/auth\.web3auth\.io$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
  /^https:\/\/developer\.metamask\.io$/,
  /^https:\/\/develop-developer\.metamask\.io$/,
  /^https:\/\/staging-developer\.metamask\.io$/,
];

/** Non-prod dashboard hosts used when `MM_DEV_API_ENV=dev`. */
const DEV_API_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/test-dashboard\.web3auth\.io$/,
  /^https:\/\/dev-developer\.metamask\.io$/,
];

const UAT_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/dev-dashboard\.web3auth\.io$/,
  /^https:\/\/uat-developer\.metamask\.io$/,
];

const PROD_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/dashboard\.web3auth\.io$/,
  /^https:\/\/developer\.metamask\.io$/,
];

const getAllowedOriginPatterns = (): RegExp[] => {
  const patterns = [...ALLOWED_ORIGIN_PATTERNS];

  const buildType = getBuildType();
  if (buildType.includes('dev')) {
    patterns.push(...DEV_API_ALLOWED_ORIGIN_PATTERNS);
  } else if (buildType.includes('uat')) {
    patterns.push(...UAT_ALLOWED_ORIGIN_PATTERNS);
  } else if (buildType.includes('prod')) {
    patterns.push(...PROD_ALLOWED_ORIGIN_PATTERNS);
  }

  return patterns;
};

interface PendingRequest {
  resolve: (cliToken: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();
let nextRequestId = 0;

const createRequestId = (): string =>
  `agentic-cli-dashboard-${Date.now()}-${(nextRequestId += 1)}`;

const normalizeToken = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;

const getCliTokenPair = (payload: Record<string, unknown> | null): string => {
  const accessToken =
    normalizeToken(payload?.access_token) ??
    normalizeToken(payload?.accessToken);
  const refreshToken =
    normalizeToken(payload?.refresh_token) ??
    normalizeToken(payload?.refreshToken);

  if (accessToken && refreshToken) {
    return `${accessToken}:${refreshToken}`;
  }

  return '';
};

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

const dismissOpenWebview = (): void => {
  const navigation = NavigationService.navigation;
  const currentRoute = navigation.getCurrentRoute()?.name;

  if (
    currentRoute === Routes.AGENTIC_CLI_DASHBOARD_WEBVIEW.CONFIRM &&
    navigation.canGoBack()
  ) {
    navigation.goBack();
  }
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
    return getAllowedOriginPatterns().some((re) => re.test(origin));
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
      return null;
    }

    if (!parsed || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;
    const payload = asRecord(obj.payload);
    if (obj.source !== AGENTIC_CLI_DASHBOARD_MESSAGE_SOURCE) {
      return null;
    }

    const type = typeof obj.type === 'string' ? obj.type : '';
    const cliToken =
      getCliTokenPair(payload) ||
      getCliTokenPair(obj) ||
      normalizeToken(obj.cli_token) ||
      normalizeToken(obj.cliToken) ||
      normalizeToken(obj.token) ||
      normalizeToken(obj.access_token) ||
      normalizeToken(payload?.cli_token) ||
      normalizeToken(payload?.cliToken) ||
      normalizeToken(payload?.token) ||
      normalizeToken(payload?.access_token) ||
      '';

    switch (type) {
      case 'approved':
        return cliToken ? { type: 'approved', cliToken } : null;
      case 'rejected':
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
        completeRequest(requestId, (pending) =>
          pending.reject(new Error('Dashboard approval timed out.')),
        );
        dismissOpenWebview();
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
