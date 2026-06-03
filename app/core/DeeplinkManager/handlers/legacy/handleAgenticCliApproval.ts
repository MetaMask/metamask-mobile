import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type {
  Intent,
  AgenticCliApprovalParams,
} from '../../../../components/Views/AgenticCliApproval/types';
import { getBuildType } from '../../../../core/OAuthService/OAuthLoginHandlers/constants';

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
export interface AgenticCliApprovalDeeplinkParams {
  intent: Intent;
  approvalPageLink?: string;
  projectId?: string;
  approvalId?: string;
  mimirSignature?: string;
  operationType?: Intent | string;
  subjectId?: string;
}

const AGENTIC_CLI_APPROVAL_HOST = {
  dev: 'https://test-dashboard.web3auth.io',
  uat: 'https://dev-dashboard.web3auth.io',
  prod: 'https://dashboard.web3auth.io',
};

const getApprovalHost = (): string => {
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

export const getDefaultApprovalPageLink = (): string =>
  `${getApprovalHost()}/agentic/login`;

/** @deprecated Use {@link getDefaultApprovalPageLink} so the host matches the current build type. */
export const DEFAULT_APPROVAL_PAGE_LINK = getDefaultApprovalPageLink();

const TX_APPROVE_OPERATION_TYPES = new Set([
  'transaction_request',
  'tx_approve',
]);

const getQueryParam = (
  searchParams: URLSearchParams,
  key: string,
): string | undefined => {
  const value = searchParams.get(key);
  return value && value.trim() !== '' ? value : undefined;
};

const resolveIntent = (operationType?: string): Intent =>
  operationType && TX_APPROVE_OPERATION_TYPES.has(operationType)
    ? 'tx_approve'
    : 'login';

/**
 * Parse agentic-cli deeplink query parameters into typed handler params.
 *
 * @param agenticCliPath Query string portion of the deeplink (e.g. `?projectId=...`)
 */
export const parseAgenticCliApprovalParams = (
  agenticCliPath?: string,
): AgenticCliApprovalDeeplinkParams => {
  const path = agenticCliPath ?? '';
  const searchParams = new URLSearchParams(
    path.includes('?')
      ? path.split('?')[1]
      : path.startsWith('?')
        ? path.slice(1)
        : path,
  );
  const operationType = getQueryParam(searchParams, 'operationType');
  return {
    intent: resolveIntent(operationType),
    approvalPageLink: getQueryParam(searchParams, 'approvalPageLink'),
    projectId: getQueryParam(searchParams, 'projectId'),
    approvalId: getQueryParam(searchParams, 'approvalId'),
    subjectId: getQueryParam(searchParams, 'subjectId'),
    mimirSignature: getQueryParam(searchParams, 'mimir_signature'),
    operationType,
  };
};

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

export const handleAgenticCliApproval = (params: {
  actionPath: string;
}): void => {
  const { actionPath } = params;
  const { projectId, approvalId, mimirSignature, operationType, subjectId } =
    parseAgenticCliApprovalParams(actionPath);

  const decodedMimirSignature = decodeParam(mimirSignature);

  const hostedApprovalPageLink = getDefaultApprovalPageLink();

  if (!projectId || !approvalId) {
    Logger.error(
      new Error(
        'handleAgenticCliApproval: missing projectId or notification/request id param',
      ),
    );
    return;
  }

  if (!hostedApprovalPageLink) {
    Logger.error(
      new Error('handleAgenticCliApproval: missing approval page link'),
    );
    return;
  }

  const navigationParams: AgenticCliApprovalParams = {
    approvalPageLink: hostedApprovalPageLink,
    projectId,
    approvalId,
    mimirSignature: decodedMimirSignature,
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
