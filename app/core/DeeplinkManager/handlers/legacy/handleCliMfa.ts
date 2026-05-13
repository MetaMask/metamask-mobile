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
 * `approvalPageLink` points to the hosted approval page, currently
 * `https://dauh7948dneg6.cloudfront.net/approval`. Mobile appends the bearer
 * token as a URL fragment once the user is unlocked.
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

  if (decodedApprovalPageLink && (!projectId || !requestIdentifier)) {
    Logger.error(
      new Error(
        'handleCliMfa: missing projectId or notification/request id param',
      ),
      `intent=${intent}`,
    );
    return;
  }

  if (!decodedApprovalPageLink && (!sessionId || !decodedServer)) {
    Logger.error(
      new Error('handleCliMfa: missing approval page link or legacy params'),
      `intent=${intent}`,
    );
    return;
  }

  const navigationParams: MfaWebviewParams = decodedApprovalPageLink
    ? {
        approvalPageLink: decodedApprovalPageLink,
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
