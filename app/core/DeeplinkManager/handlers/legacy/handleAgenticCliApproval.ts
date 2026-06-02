import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type {
  Intent,
  AgenticCliApprovalParams,
} from '../../../../components/Views/AgenticCliApproval/types';

/**
 * Handles `https://link.metamask.io/agentic-cli` deeplinks.
 *
 * Preferred query string:
 * `?approvalPageLink=<url>&projectId=<id>&approvalId=<approvalId>&mimir_signature=<sig>`
 *
 * `approvalPageLink` is optional for the production redirect flow. When it is
 * omitted, mobile falls back to the dashboard-hosted Agentic login page and
 * appends the bearer token as `#auth_token=...` once the user is unlocked.
 *
 * The pending-deeplink saga (app/store/sagas/index.ts) gates this on
 * vault-unlocked + onboarding-complete, so by the time we run we know the
 * AuthenticationController can issue a bearer.
 */
interface HandleAgenticCliApprovalParams {
  intent: Intent;
  approvalPageLink?: string;
  projectId?: string;
  notificationId?: string;
  requestId?: string;
  approvalId?: string;
  mimir_signature?: string;
  mimirSignature?: string;
  operationType?: Intent | string;
  subjectId?: string;
}

export const DEFAULT_APPROVAL_PAGE_LINK =
  'https://test-dashboard.web3auth.io/agentic/login';

const decodeParam = (value?: string): string | undefined => {
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch (err) {
    Logger.error(
      err as Error,
      'handleAgenticCliApproval: failed to decode param',
    );
    return undefined;
  }
};

export const handleAgenticCliApproval = (
  params: HandleAgenticCliApprovalParams,
): void => {
  const {
    intent,
    approvalPageLink,
    projectId,
    notificationId,
    requestId,
    approvalId,
    mimir_signature,
    mimirSignature,
    operationType,
    subjectId,
  } = params;
  const decodedApprovalPageLink = decodeParam(approvalPageLink);
  const decodedMimirSignature = decodeParam(mimirSignature ?? mimir_signature);
  const requestIdentifier = notificationId ?? requestId ?? approvalId;
  const hostedApprovalPageLink =
    decodedApprovalPageLink ??
    (projectId && requestIdentifier ? DEFAULT_APPROVAL_PAGE_LINK : undefined);

  if (hostedApprovalPageLink && (!projectId || !requestIdentifier)) {
    Logger.error(
      new Error(
        'handleAgenticCliApproval: missing projectId or notification/request id param',
      ),
      `intent=${intent}`,
    );
    return;
  }

  if (!hostedApprovalPageLink) {
    Logger.error(
      new Error('handleAgenticCliApproval: missing approval page link'),
      `intent=${intent}`,
    );
    return;
  }

  const navigationParams: AgenticCliApprovalParams = {
    approvalPageLink: hostedApprovalPageLink,
    projectId,
    notificationId,
    requestId,
    approvalId,
    mimirSignature: decodedMimirSignature,
    operationType: operationType ?? intent,
    subjectId,
  };
  // The 200ms gap mirrors `handleDeeplinkSaga`'s setTimeout — gives any
  // ongoing navigation transition time to settle before we push our screen.
  setTimeout(() => {
    NavigationService.navigation?.navigate(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      navigationParams,
    );
  }, 200);
};
