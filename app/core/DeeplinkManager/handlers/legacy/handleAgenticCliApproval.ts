import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type { AgenticCliApprovalParams } from '../../../../components/Views/AgenticCliApproval/types';
import { AgenticCliApprovalService } from '../../../../components/Views/AgenticCliApproval/AgenticCliApprovalService';

/**
 * Handles `https://link.metamask.io/agentic-cli` deeplinks.
 *
 * Preferred query string:
 * `?approvalPagePath=/agentic/approval&projectId=<id>&approvalId=<approvalId>&mimirSignature=<sig>`
 *
 * Dashboard host is always chosen on-device from build type. `approvalPagePath`
 * may override only the path segment (default `/agentic/login`).
 *
 * The pending-deeplink saga (app/store/sagas/index.ts) gates this on
 * vault-unlocked + onboarding-complete, so by the time we run we know the
 * AuthenticationController can issue a bearer.
 */

export const parseAgenticCliApprovalParams =
  AgenticCliApprovalService.parseDeeplinkQuery;

export const handleAgenticCliApproval = (params: {
  actionPath: string;
}): void => {
  const parsed = AgenticCliApprovalService.parseDeeplinkQuery(
    params.actionPath,
  );
  const {
    projectId,
    approvalId,
    mimirSignature,
    operationType,
    subjectId,
    approvalPagePath,
  } = parsed;

  if (!projectId || !approvalId) {
    Logger.error(
      new Error(
        'handleAgenticCliApproval: missing projectId or approvalId param',
      ),
    );
    return;
  }

  const navigationParams: AgenticCliApprovalParams = {
    approvalPagePath:
      AgenticCliApprovalService.validateApprovalPagePath(approvalPagePath),
    projectId,
    approvalId,
    mimirSignature:
      AgenticCliApprovalService.decodeDeeplinkParam(mimirSignature),
    operationType,
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
