import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type {
  Intent,
  MfaWebviewParams,
} from '../../../../components/Views/MfaWebview/types';

/**
 * Handles `https://link.metamask.io/agentic-cli` deeplinks.
 *
 * Preferred query string:
 * `?approvalPageLink=<url>&projectId=<id>&notificationId=<requestId>&operationType=<login|tx_approve>&subjectId=<id>`
 *
 * `approvalPageLink` is optional for the production redirect flow. When it is
 * omitted, mobile falls back to the hosted approval page and appends the
 * bearer token as a URL fragment once the user is unlocked.
 *
 * The pending-deeplink saga (app/store/sagas/index.ts) gates this on
 * vault-unlocked + onboarding-complete, so by the time we run we know the
 * AuthenticationController can issue a bearer.
 */
interface HandleCliMfaParams {
  intent: Intent;
  approvalPageLink?: string;
  projectId?: string;
  notificationId?: string;
  requestId?: string;
  approvalId?: string;
  operationType?: Intent | string;
  subjectId?: string;

  /** Legacy local mock params. */
  sessionId?: string;
  server?: string;
}

export const DEFAULT_APPROVAL_PAGE_LINK =
  'https://developer.metamask.io/agentic/approval';

const decodeParam = (value?: string): string | undefined => {
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch (err) {
    Logger.error(err as Error, 'handleCliMfa: failed to decode param');
    return undefined;
  }
};

export const handleCliMfa = (params: HandleCliMfaParams): void => {
  const {
    intent,
    approvalPageLink,
    projectId,
    notificationId,
    requestId,
    approvalId,
    operationType,
    subjectId,
    sessionId,
    server,
  } = params;
  DevLogger.log('[handleCliMfa] starting', params);

  const decodedApprovalPageLink = decodeParam(approvalPageLink);
  const decodedServer = decodeParam(server);
  const requestIdentifier = notificationId ?? requestId ?? approvalId;
  const hostedApprovalPageLink =
    decodedApprovalPageLink ??
    (projectId && requestIdentifier ? DEFAULT_APPROVAL_PAGE_LINK : undefined);

  if (hostedApprovalPageLink && (!projectId || !requestIdentifier)) {
    Logger.error(
      new Error(
        'handleCliMfa: missing projectId or notification/request id param',
      ),
      `intent=${intent}`,
    );
    return;
  }

  if (!hostedApprovalPageLink && (!sessionId || !decodedServer)) {
    Logger.error(
      new Error('handleCliMfa: missing approval page link or legacy params'),
      `intent=${intent}`,
    );
    return;
  }

  const navigationParams: MfaWebviewParams = hostedApprovalPageLink
    ? {
        approvalPageLink: hostedApprovalPageLink,
        projectId,
        notificationId,
        requestId,
        approvalId,
        operationType: operationType ?? intent,
        subjectId,
      }
    : {
        sessionId,
        server: decodedServer,
        intent,
      };
  // The 200ms gap mirrors `handleDeeplinkSaga`'s setTimeout — gives any
  // ongoing navigation transition time to settle before we push our screen.
  setTimeout(() => {
    NavigationService.navigation?.navigate(
      Routes.MFA_WEBVIEW.CONFIRM,
      navigationParams,
    );
  }, 200);
};
