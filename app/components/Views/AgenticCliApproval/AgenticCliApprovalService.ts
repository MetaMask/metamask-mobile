import { getBuildType } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import Logger from '../../../util/Logger';
import {
  MESSAGE_SOURCE,
  type AgenticCliApprovalParams,
  type WebviewToNative,
} from './types';

/**
 * Agentic CLI approval — URL/host resolution, deeplink parsing, WebView policy.
 * Mirrors the structure of `app/components/UI/Card/services/DaimoPayService`.
 */

/** Cap message size — defends against the SPA blasting megabytes of JSON. */
export const MAX_MESSAGE_LENGTH = 16 * 1024;

export const DEFAULT_APPROVAL_PAGE_PATH = '/agentic/approval';

const AGENTIC_CLI_APPROVAL_HOST = {
  dev: 'https://develop-developer.metamask.io',
  uat: 'https://staging-developer.metamask.io',
  prod: 'https://developer.metamask.io',
} as const;

/**
 * Origins the WebView is allowed to render and receive postMessage from.
 * Anything outside the list is opened in the OS browser (top-frame only).
 */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/link\.metamask\.io$/,
  /^https:\/\/developer\.metamask\.io$/,
  /^https:\/\/develop-developer\.metamask\.io$/,
  /^https:\/\/staging-developer\.metamask\.io$/,
  /^https:\/\/test-dashboard\.web3auth\.io$/,
  /^https:\/\/dev-dashboard\.web3auth\.io$/,
  /^https:\/\/auth\.web3auth\.io$/,
  /^https:\/\/js\.stripe\.com$/,
  /^https:\/\/[a-z0-9.-]+\.stripe\.network$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
];

const isOriginAllowed = (origin: string): boolean =>
  ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));

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

export const resolveApprovalPageUrl = (): URL =>
  new URL(DEFAULT_APPROVAL_PAGE_PATH, getApprovalHost());

export const AgenticCliApprovalService = {
  getApprovalHost,
  resolveApprovalPageUrl,

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
   * `${mobileHost}/agentic/approval?projectId=...&approvalId=...`
   */
  buildWebViewUrl(params: AgenticCliApprovalParams): string {
    const { projectId, approvalId, mimirSignature, operationType, subjectId } =
      params;

    const url = resolveApprovalPageUrl();

    if (projectId) url.searchParams.set('projectId', projectId);
    if (approvalId) url.searchParams.set('approvalId', approvalId);
    if (mimirSignature) {
      url.searchParams.set('mimirSignature', mimirSignature);
    }
    if (operationType) url.searchParams.set('operationType', operationType);
    if (subjectId) url.searchParams.set('subjectId', subjectId);

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
