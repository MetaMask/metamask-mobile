/**
 * Host-owned locked social MFA helpers for wallet recovery.
 *
 * Lives outside Accounts `useMfa` / `flow.ts` so this PR does not change kit
 * entry points. Uses existing kit primitives (`startMfaFlow`, social adapter).
 */
import {
  getMfaErrorCode,
  type EnrolledCredential,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import {
  createSocialLoginControllerAdapter,
  mobileMfaControllerAdapter,
} from '../../../../util/identity/mfa/bindings';
import {
  getActiveMfaFlow,
  startMfaFlow,
  subscribeToActiveMfaFlow,
} from '../../../../util/identity/mfa/engine/activeFlow';
import type { MfaEvent } from '../../../../util/identity/mfa/engine/analytics';
import { METHOD_COST_RANKING } from '../../../../util/identity/mfa/engine/planner';
import type {
  MfaFlowOptions,
  MfaFlowResult,
  MfaMethod,
  MfaReason,
} from '../../../../util/identity/mfa/engine/types';
import { mobilePasskeyAdapter } from '../../../../util/identity/mfa/passkeyAdapter';

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
 * Lists active MFA factors for social-login recovery while the wallet is
 * locked (`refreshSocialLoginCredentials`). Empty when none are enrolled.
 */
export const listActiveSocialLoginMethods = async (): Promise<MfaMethod[]> => {
  const controller = createSocialLoginControllerAdapter();
  const credentials = await controller.refreshEnrolledCredentials();
  return activeSocialMethods(credentials);
};

/**
 * On `main`, OS passkey cancel does not settle the kit flow — it shows the
 * kit passkey retry step with `passkey_ceremony_cancelled` and leaves
 * `startMfaFlow` pending. Host recovery needs `flow_cancelled` so it can
 * open the full-screen methods list.
 *
 * `subscribeToActiveMfaFlow` only fires when the active flow starts/ends.
 * Passkey-cancel updates the *flow state*, so we also subscribe to
 * `flow.subscribe` (same pattern as `useActiveMfaFlow`).
 *
 * @param operation - `reason.operation` for the locked verify in flight.
 * @returns Unsubscribe.
 */
const watchPasskeyCeremonyCancel = (
  operation: MfaReason['operation'],
): (() => void) => {
  let cancelled = false;
  let unsubscribeFlowState: (() => void) | undefined;

  const maybeCancel = () => {
    if (cancelled) {
      return;
    }
    const flow = getActiveMfaFlow();
    if (!flow || flow.reason.operation !== operation) {
      return;
    }
    const { step, error } = flow.getState();
    if (
      step.name !== 'passkey' ||
      step.purpose !== 'verify' ||
      error !== 'passkey_ceremony_cancelled'
    ) {
      return;
    }
    cancelled = true;
    Logger.log('OAuthRehydration: ending kit flow after OS passkey cancel', {
      operation,
    });
    flow.dispatch({ type: 'cancel' });
  };

  const attachToActiveFlow = () => {
    if (cancelled) {
      return;
    }
    unsubscribeFlowState?.();
    unsubscribeFlowState = undefined;
    const flow = getActiveMfaFlow();
    if (!flow || flow.reason.operation !== operation) {
      return;
    }
    unsubscribeFlowState = flow.subscribe(maybeCancel);
    maybeCancel();
  };

  const unsubscribeActive = subscribeToActiveMfaFlow(attachToActiveFlow);
  attachToActiveFlow();
  return () => {
    cancelled = true;
    unsubscribeFlowState?.();
    unsubscribeActive();
  };
};

/**
 * Proves it's the user during social-login wallet recovery, while the wallet
 * is still locked. Never enrolls. When `method` is set, verifies only that
 * factor (custom picker). Otherwise tries `methods`, or cost order
 * (passkey → totp → email) when `methods` is omitted, one at a time.
 * Rejects with `credential_not_enrolled` when none is active, or with the
 * code of an error the kit has already shown.
 *
 * Pairs the social identifier first (`exchangeSocialAccessToken`); exchange
 * failure is non-fatal.
 *
 * For passkey attempts, OS cancel is turned into `flow_cancelled` via the
 * active-flow watcher (no Accounts `flow.ts` change).
 */
export const verifyForSocialLogin = async ({
  reason,
  method,
  methods,
}: {
  reason: MfaReason;
  /** When set, verify only this enrolled factor (no cost-order loop). */
  method?: MfaMethod;
  /**
   * Factors to try, in order, when `method` is omitted. Defaults to
   * passkey → totp → email. Google/Apple arrival passes a list without
   * email, because that inbox is the sign-in factor.
   */
  methods?: readonly MfaMethod[];
}): Promise<MfaFlowResult & { verifiedMethod: MfaMethod }> => {
  try {
    await Engine.context.AuthenticationController.exchangeSocialAccessToken();
  } catch (exchangeError) {
    Logger.log('OAuthRehydration: social login exchange failed', {
      message:
        exchangeError instanceof Error
          ? exchangeError.message
          : String(exchangeError),
    });
  }

  // One adapter for every attempt: it keeps the flow's verification token.
  const controller = createSocialLoginControllerAdapter();
  const methodsToTry = method
    ? [method]
    : [...(methods ?? METHOD_COST_RANKING)];
  let lastError: unknown;

  for (const next of methodsToTry) {
    const stopWatchingPasskeyCancel =
      next === 'passkey'
        ? watchPasskeyCeremonyCancel(reason.operation)
        : undefined;
    try {
      // A single-method verifyOnly plan auto-starts that method. Passing
      // every method at once would show the picker when several are active.
      const flowResult = await startMfaFlow({
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
      return { ...flowResult, verifiedMethod: next };
    } catch (error) {
      lastError = error;
      if (getMfaErrorCode(error) === 'credential_not_enrolled') {
        continue;
      }
      throw error;
    } finally {
      stopWatchingPasskeyCancel?.();
    }
  }

  throw lastError;
};
