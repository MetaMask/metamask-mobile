import { useSelector } from 'react-redux';
import {
  getMfaErrorCode,
  type EnrolledCredential,
} from '@metamask/profile-sync-controller/sdk';
import { selectEnrolledCredentials } from '../../../selectors/identity';
import {
  createSocialLoginControllerAdapter,
  mobileMfaControllerAdapter,
} from './bindings';
import { mobilePasskeyAdapter } from './passkeyAdapter';
import { startMfaFlow } from './engine/activeFlow';
import { METHOD_COST_RANKING } from './engine/planner';
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

/** Active social MFA factors in kit cost order (passkey → totp → email). */
const activeSocialMethods = (
  credentials: EnrolledCredential[],
): MfaMethod[] => {
  const active = new Set(
    credentials
      .filter((credential) => credential.status === 'active')
      .map((credential) => credential.type),
  );
  return METHOD_COST_RANKING.filter((method) => active.has(method));
};

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

/**
 * Non-hook entry for features that must prove or enroll MFA outside React
 * (for example automatic passwordless recovery setup after unlock).
 */
export const verifyOrEnroll = ({
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
 * Lists active MFA factors for social-login recovery while the wallet is
 * locked (`refreshSocialLoginCredentials`). Empty when none are enrolled.
 */
const listActiveSocialLoginMethods = async (): Promise<MfaMethod[]> => {
  const controller = createSocialLoginControllerAdapter();
  const credentials = await controller.refreshEnrolledCredentials();
  return activeSocialMethods(credentials);
};

/**
 * Proves it's the user during social-login wallet recovery, while the wallet
 * is still locked. Never enrolls. When `method` is set, verifies only that
 * factor (custom picker). Otherwise tries methods in cost order
 * (passkey → totp → email) one at a time. Rejects with
 * `credential_not_enrolled` when none is active, or with the code of an
 * error the kit has already shown.
 */
const verifyForSocialLogin = async ({
  reason,
  method,
}: {
  reason: MfaReason;
  /** When set, verify only this enrolled factor (no cost-order loop). */
  method?: MfaMethod;
}): Promise<MfaFlowResult> => {
  // One adapter for every attempt: it keeps the flow's verification token.
  const controller = createSocialLoginControllerAdapter();
  const methodsToTry = method ? [method] : METHOD_COST_RANKING;
  let lastError: unknown;

  for (const next of methodsToTry) {
    try {
      // A single-method verifyOnly plan auto-starts that method. Passing
      // every method at once would show the picker when several are active.
      return await startMfaFlow({
        request: {
          kind: 'verifyOrEnroll',
          methods: [next],
          verifyWith: [next],
          verifyOnly: true,
        },
        reason,
        ...clientOptions,
        controller,
      });
    } catch (error) {
      lastError = error;
      if (getMfaErrorCode(error) === 'credential_not_enrolled') {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
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
 * - `listActiveSocialLoginMethods`: locked recovery — which factors to show
 * on the custom picker (`refreshSocialLoginCredentials`).
 * - `verifyForSocialLogin`: locked recovery verify. Optional `method` for the
 * custom picker; otherwise cost-order fallback. Never enrolls.
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
