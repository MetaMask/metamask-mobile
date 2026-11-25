import { useSelector } from 'react-redux';
import { selectEnrolledCredentials } from '../../../selectors/identity';
import {
  createSocialLoginControllerAdapter,
  mobileMfaControllerAdapter,
} from './bindings';
import { mobilePasskeyAdapter } from './passkeyAdapter';
import { startMfaFlow } from './engine/activeFlow';
import { getVerifiableMethods, METHOD_COST_RANKING } from './engine/planner';
import Logger from '../../Logger';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { analytics } from '../../analytics/analytics';
import type { MfaEvent } from './engine/analytics';
import type {
  EnrollOptions,
  MfaFlowOptions,
  MfaFlowResult,
  MfaMethod,
  MfaReason,
  VerifyOrEnrollOptions,
} from './engine/types';

const EVENTS: Record<MfaEvent, IMetaMetricsEvent> = {
  'MFA Flow Status Updated': MetaMetricsEvents.MFA_FLOW_STATUS_UPDATED,
  'MFA Step Viewed': MetaMetricsEvents.MFA_STEP_VIEWED,
  'MFA Error Viewed': MetaMetricsEvents.MFA_ERROR_VIEWED,
  'MFA Error CTA Clicked': MetaMetricsEvents.MFA_ERROR_CTA_CLICKED,
  'MFA Method Selected': MetaMetricsEvents.MFA_METHOD_SELECTED,
  'MFA Code Resent': MetaMetricsEvents.MFA_CODE_RESENT,
};

const clientOptions: Pick<
  MfaFlowOptions,
  'platform' | 'controller' | 'passkey' | 'reportError' | 'trackEvent'
> = {
  platform: 'mobile',
  controller: mobileMfaControllerAdapter,
  passkey: mobilePasskeyAdapter,
  reportError: (error, { code, operation, step }) =>
    Logger.error(error instanceof Error ? error : new Error(code), {
      tags: { feature: 'mfa', mfaCode: code, operation },
      context: { name: 'mfa_flow', data: { step } },
    }),
  trackEvent: (event, properties) =>
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(EVENTS[event])
        .addProperties(properties)
        .build(),
    ),
};

const verifyOrEnroll = ({
  reason,
  ...request
}: VerifyOrEnrollOptions): Promise<MfaFlowResult> =>
  startMfaFlow({
    request: { kind: 'verifyOrEnroll', ...request },
    reason,
    ...clientOptions,
  });

const enroll = ({ method, reason }: EnrollOptions): Promise<MfaFlowResult> =>
  startMfaFlow({
    request: { kind: 'enroll', method },
    reason,
    ...clientOptions,
  });

/**
 * Lists MFA factors that can verify while the wallet is locked
 * (`refreshSocialLoginCredentials`), in kit cost order.
 */
const listActiveSocialLoginMethods = async (): Promise<MfaMethod[]> => {
  const controller = createSocialLoginControllerAdapter();
  const credentials = await controller.refreshEnrolledCredentials();
  return getVerifiableMethods(credentials, 'mobile');
};

/**
 * Proves it's the user during social-login wallet recovery, while the wallet
 * is still locked. Never enrolls. When `method` is set, verifies only that
 * factor (and auto-starts it). Without `method`, every platform method may
 * verify: a single active one starts directly; several open the kit's
 * picker. Rejects with `credential_not_enrolled` when none is active, or
 * with the code of an error the kit has already shown.
 *
 * Callers that need the social identifier paired first should run
 * `exchangeSocialAccessToken` themselves before this (non-fatal on failure).
 */
const verifyForSocialLogin = ({
  reason,
  method,
}: {
  reason: MfaReason;
  /** When set, verify only this enrolled factor. */
  method?: MfaMethod;
}): Promise<MfaFlowResult> => {
  const methods = method ? [method] : [...METHOD_COST_RANKING];
  return startMfaFlow({
    // A single-method verifyOnly plan auto-starts that method. Passing
    // every method lets the kit pick among active ones (picker when several).
    request: {
      kind: 'verifyOrEnroll',
      methods,
      verifyWith: methods,
      verifyOnly: true,
    },
    reason,
    ...clientOptions,
    // One adapter per flow: it keeps the flow's own verification token.
    controller: createSocialLoginControllerAdapter(),
  });
};

/**
 * The MFA kit for features and settings.
 *
 * - `verifyOrEnroll`: makes sure `methods` are set up, then, when
 * `verifyWith` is set, resolves with a verification token proven with one of
 * them. Rejects with `flow_cancelled` when the user backs out, or with the
 * code of an error the kit has already shown. This is the only way features
 * get a token: `AuthenticationController.getVerificationToken` is low-level
 * (it knows nothing of `verifyWith`, and returns `null` instead of showing
 * the screens), and lint rejects it outside this folder.
 * - `enroll`: sets up one method, for example from settings. No intro, no
 * verification after.
 * - `listActiveSocialLoginMethods`: locked recovery — which factors can
 * verify (`refreshSocialLoginCredentials` + `getVerifiableMethods`).
 * - `verifyForSocialLogin`: locked recovery verify. Optional `method` for a
 * single factor; without it, the kit picks among active methods. Never
 * enrolls.
 * - `credentials`: the profile's methods, as last fetched from the server.
 *
 * @returns The kit's entry points and the credential list.
 */
export const useMfa = () => {
  const credentials = useSelector(selectEnrolledCredentials);
  return {
    credentials,
    verifyOrEnroll,
    enroll,
    listActiveSocialLoginMethods,
    verifyForSocialLogin,
  };
};
