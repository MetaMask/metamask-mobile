import { SDK } from '@metamask/profile-sync-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { authEnv } from '../../../core/devApiEnv';
import { getBuildType } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import Logger from '../../../util/Logger';
import {
  MESSAGE_SOURCE,
  type AgenticCliApprovalParams,
  type WebviewToNative,
} from './types';

/**
 * Agentic CLI approval — URL/host resolution, auth, deeplink parsing, WebView policy.
 * Mirrors the structure of `app/components/UI/Card/services/DaimoPayService`.
 */

/** Cap message size — defends against the SPA blasting megabytes of JSON. */
export const MAX_MESSAGE_LENGTH = 16 * 1024;

export const DEFAULT_APPROVAL_PAGE_PATH = '/agentic/login';

const APPROVAL_PAGE_PATH_PATTERN = /^\/agentic\/[a-zA-Z0-9/_-]+$/;

const CLI_DASHBOARD_TOKEN_PATH = '/api/v2/mm-qr-login/token';

const AGENTIC_CLI_APPROVAL_HOST = {
  dev: 'https://test-dashboard.web3auth.io',
  uat: 'https://dev-dashboard.web3auth.io',
  prod: 'https://developer.metamask.io',
} as const;

interface CliDashboardTokenResponse {
  access_token?: unknown;
}

/**
 * Origins the WebView is allowed to render and receive postMessage from.
 * Anything outside the list is opened in the OS browser (top-frame only).
 */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/link\.metamask\.io$/,
  /^https:\/\/developer\.metamask\.io$/,
  /^https:\/\/test-dashboard\.web3auth\.io$/,
  /^https:\/\/dev-dashboard\.web3auth\.io$/,
  /^https:\/\/auth\.web3auth\.io$/,
  /^https:\/\/js\.stripe\.com$/,
  /^https:\/\/[a-z0-9.-]+\.stripe\.network$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
];

const isOriginAllowed = (origin: string): boolean =>
  ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));

const getPrimaryEntropySourceId = (): string | undefined => {
  const keyrings = Engine.context.KeyringController.state.keyrings;
  return keyrings.find((keyring) => keyring.type === KeyringTypes.hd)?.metadata
    .id;
};

const getCliDashboardTokenUrl = (): string => {
  const url = new URL(SDK.getEnvUrls(authEnv()).authApiUrl);
  url.pathname = CLI_DASHBOARD_TOKEN_PATH;
  return url.toString();
};

const getCliDashboardAccessToken = async (
  hydraToken: string,
): Promise<string> => {
  const response = await fetch(getCliDashboardTokenUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${hydraToken}` },
    body: '',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to get CLI dashboard token: ${response.status} ${errorBody}`,
    );
  }

  const data = (await response.json()) as CliDashboardTokenResponse;
  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Failed to get CLI dashboard token: missing access_token');
  }

  return data.access_token;
};

const getQueryParam = (
  searchParams: URLSearchParams,
  key: string,
): string | undefined => {
  const value = searchParams.get(key);
  return value && value.trim() !== '' ? value : undefined;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Read a query param from the raw query string without applying
 * application/x-www-form-urlencoded `+` → space conversion.
 */
const getRawQueryParam = (
  queryString: string,
  key: string,
): string | undefined => {
  const match = queryString.match(
    new RegExp(`(?:^|&)${escapeRegExp(key)}=([^&]*)`),
  );
  const value = match?.[1];
  return value && value.trim() !== '' ? value : undefined;
};

export const getApprovalHost = (): string => {
  const buildType = getBuildType();

  if (buildType === 'development') {
    return AGENTIC_CLI_APPROVAL_HOST.dev;
  }
  if (buildType.includes('prod')) {
    return AGENTIC_CLI_APPROVAL_HOST.prod;
  }
  if (buildType.includes('uat')) {
    return AGENTIC_CLI_APPROVAL_HOST.uat;
  }
  if (buildType.includes('dev')) {
    return AGENTIC_CLI_APPROVAL_HOST.dev;
  }
  return AGENTIC_CLI_APPROVAL_HOST.dev;
};

export const validateApprovalPagePath = (path?: string): string => {
  if (!path || path.trim() === '') {
    return DEFAULT_APPROVAL_PAGE_PATH;
  }

  const trimmed = path.trim();
  if (
    trimmed.includes('://') ||
    trimmed.includes('..') ||
    !trimmed.startsWith('/') ||
    !APPROVAL_PAGE_PATH_PATTERN.test(trimmed)
  ) {
    Logger.error(
      new Error(`Invalid approval page path: ${path}`),
      'AgenticCliApprovalService: invalid approvalPagePath',
    );
    return DEFAULT_APPROVAL_PAGE_PATH;
  }

  return trimmed;
};

export const resolveApprovalPageUrl = (path?: string): URL => {
  const validatedPath = validateApprovalPagePath(path);
  return new URL(validatedPath, getApprovalHost());
};

export const AgenticCliApprovalService = {
  getCliDashboardTokenUrl,
  getApprovalHost,
  validateApprovalPagePath,
  resolveApprovalPageUrl,

  async getAuthToken(): Promise<string> {
    const hydraToken =
      await Engine.context.AuthenticationController.getBearerToken(
        getPrimaryEntropySourceId(),
      );

    if (!hydraToken) {
      throw new Error('No bearer token available — is the user signed in?');
    }

    return getCliDashboardAccessToken(hydraToken);
  },

  /**
   * Parse agentic-cli deeplink query parameters.
   *
   * @param agenticCliPath Query string portion (e.g. `?projectId=...`)
   */
  parseDeeplinkQuery(agenticCliPath?: string): AgenticCliApprovalParams {
    const path = agenticCliPath ?? '';
    const queryString = path.includes('?')
      ? path.split('?')[1]
      : path.startsWith('?')
        ? path.slice(1)
        : path;
    const searchParams = new URLSearchParams(queryString);

    return {
      approvalPagePath: getQueryParam(searchParams, 'approvalPagePath'),
      projectId: getQueryParam(searchParams, 'projectId'),
      approvalId: getQueryParam(searchParams, 'approvalId'),
      subjectId: getQueryParam(searchParams, 'subjectId'),
      // Base64-style signatures may contain literal `+`; URLSearchParams would
      // misread those as spaces, so read the raw value and decode separately.
      mimirSignature: getRawQueryParam(queryString, 'mimirSignature'),
      operationType: getQueryParam(searchParams, 'operationType'),
    };
  },

  decodeDeeplinkParam(value?: string): string | undefined {
    if (!value) return undefined;

    try {
      return decodeURIComponent(value);
    } catch (err) {
      Logger.error(
        err as Error,
        'AgenticCliApprovalService: failed to decode deeplink param',
      );
      return undefined;
    }
  },

  /**
   * `${mobileHost}${approvalPagePath}?projectId=...#auth_token=${bearer}`
   *
   * The bearer goes in the URL fragment so it is readable by the dashboard
   * login JS but is not sent as part of the HTTP request.
   */
  buildWebViewUrl(
    params: AgenticCliApprovalParams,
    bearerToken: string,
  ): string {
    const {
      approvalPagePath,
      projectId,
      approvalId,
      mimirSignature,
      operationType,
      subjectId,
    } = params;

    const url = resolveApprovalPageUrl(approvalPagePath);
    const origin = `${url.protocol}//${url.host}`;
    const expectedOrigin = getApprovalHost();

    if (origin !== expectedOrigin && !isOriginAllowed(origin)) {
      throw new Error('Approval page origin is not allowed');
    }

    if (projectId) url.searchParams.set('projectId', projectId);
    if (approvalId) url.searchParams.set('approvalId', approvalId);
    if (mimirSignature) {
      url.searchParams.set('mimirSignature', mimirSignature);
    }
    if (operationType) url.searchParams.set('operationType', operationType);
    if (subjectId) url.searchParams.set('subjectId', subjectId);
    url.hash = `auth_token=${encodeURIComponent(bearerToken)}`;

    return url.toString();
  },

  isOriginAllowed(origin: string): boolean {
    return isOriginAllowed(origin);
  },

  shouldLoadInWebView(url: string): boolean {
    try {
      const u = new URL(url);
      return AgenticCliApprovalService.isOriginAllowed(
        `${u.protocol}//${u.host}`,
      );
    } catch {
      return false;
    }
  },

  parseEvent(raw: unknown): WebviewToNative | null {
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
    if (obj.source !== MESSAGE_SOURCE) return null;
    const approvalId =
      typeof obj.approvalId === 'string' && obj.approvalId
        ? obj.approvalId
        : null;
    if (!approvalId) return null;

    switch (obj.type) {
      case 'approved':
      case 'rejected':
      case 'close':
        return {
          source: MESSAGE_SOURCE,
          type: obj.type,
          approvalId,
        };
      case 'error':
        return {
          source: MESSAGE_SOURCE,
          type: 'error',
          approvalId,
          message:
            typeof obj.message === 'string' ? obj.message : 'Unknown error',
        };
      default:
        return null;
    }
  },
};
