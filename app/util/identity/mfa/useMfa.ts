import { useSelector } from 'react-redux';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
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
 * Proves it's the user during social-login wallet recovery, while the wallet
 * is still locked. Never enrolls. Tries enrolled methods in cost order
 * (passkey → totp → email) one at a time so the kit opens the highest
 * available method directly instead of a multi-method picker. Rejects with
 * `credential_not_enrolled` when none is active, or with the code of an
 * error the kit has already shown.
 */
const verifyForSocialLogin = async ({
  reason,
}: {
  reason: MfaReason;
}): Promise<MfaFlowResult> => {
  // One adapter for every attempt: it keeps the flow's verification token.
  const controller = createSocialLoginControllerAdapter();
  let lastError: unknown;

  for (const method of METHOD_COST_RANKING) {
    try {
      // A single-method verifyOnly plan auto-starts that method. Passing
      // every method at once would show the picker when several are active.
      return await startMfaFlow({
        request: {
          kind: 'verifyOrEnroll',
          methods: [method],
          verifyWith: [method],
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
 * - `verifyForSocialLogin`: social-login wallet recovery, before the wallet
 * is unlocked. Opens the highest enrolled method directly (passkey first);
 * never enrolls.
 * - `credentials`: the profile's methods, as last fetched from the server.
 *
 * @returns The kit's entry points and the credential list.
 */
export const useMfa = () => {
  const credentials = useSelector(selectEnrolledCredentials);
  return { credentials, verifyOrEnroll, enroll, verifyForSocialLogin };
};
