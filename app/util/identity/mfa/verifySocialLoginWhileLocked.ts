import {
  getMfaErrorCode,
  type EnrolledCredential,
} from '@metamask/profile-sync-controller/sdk';
import Logger from '../../Logger';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { analytics } from '../../analytics/analytics';
import { createSocialLockedMfaControllerAdapter } from './socialLockedBindings';
import { mobilePasskeyAdapter } from './passkeyAdapter';
import { startMfaFlow } from './engine/activeFlow';
import type { MfaEvent } from './engine/analytics';
import type {
  MfaFlowResult,
  MfaMethod,
  MfaReason,
  VerifyOrEnrollOptions,
} from './engine/types';

/** Active factors in kit cost order (passkey → totp → email). */
const activeSocialMfaMethods = (
  credentials: EnrolledCredential[],
): MfaMethod[] => {
  const active = new Set(
    credentials
      .filter((credential) => credential.status === 'active')
      .map((credential) => credential.type),
  );
  return (['passkey', 'totp', 'email_otp'] as const).filter((method) =>
    active.has(method),
  );
};

const EVENTS: Record<MfaEvent, IMetaMetricsEvent> = {
  'MFA Flow Status Updated': MetaMetricsEvents.MFA_FLOW_STATUS_UPDATED,
  'MFA Step Viewed': MetaMetricsEvents.MFA_STEP_VIEWED,
  'MFA Error Viewed': MetaMetricsEvents.MFA_ERROR_VIEWED,
  'MFA Error CTA Clicked': MetaMetricsEvents.MFA_ERROR_CTA_CLICKED,
  'MFA Method Selected': MetaMetricsEvents.MFA_METHOD_SELECTED,
  'MFA Code Resent': MetaMetricsEvents.MFA_CODE_RESENT,
};

export type VerifySocialLoginWhileLockedResult =
  | { status: 'skipped'; reason: 'no_methods' | 'list_failed' }
  | { status: 'verified'; result: MfaFlowResult }
  /** Passkey/primary dismissed — host should show full-screen method picker. */
  | { status: 'fallback'; methods: MfaMethod[] }
  | { status: 'cancelled' }
  | { status: 'failed'; error: unknown };

const startLockedVerify = (
  reason: MfaReason,
  opts: Omit<VerifyOrEnrollOptions, 'reason'>,
) => {
  const controller = createSocialLockedMfaControllerAdapter();
  return startMfaFlow({
    request: { kind: 'verifyOrEnroll', ...opts },
    reason,
    platform: 'mobile',
    controller,
    passkey: mobilePasskeyAdapter,
    reportError: (error, { code, operation, step }) =>
      Logger.error(error instanceof Error ? error : new Error(code), {
        tags: { feature: 'mfa', mfaCode: code, operation },
        context: { name: 'mfa_flow_social_locked', data: { step } },
      }),
    trackEvent: (event, properties) =>
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(EVENTS[event])
          .addProperties(properties)
          .build(),
      ),
  });
};

const listLockedSocialMethods = async (
  reason: MfaReason,
): Promise<
  | { status: 'ok'; methods: MfaMethod[] }
  | { status: 'skipped'; reason: 'no_methods' | 'list_failed' }
> => {
  const controller = createSocialLockedMfaControllerAdapter();
  try {
    // OAuth can land here before Seedless social state is ready — retry briefly.
    const maxAttempts = 5;
    let credentials: EnrolledCredential[] = [];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        credentials = await controller.refreshEnrolledCredentials();
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable =
          message.includes('no social login') ||
          message.includes('no social access token');
        if (!retryable || attempt === maxAttempts) {
          throw error;
        }
        Logger.log('verifySocialLoginWhileLocked: waiting for social state', {
          attempt,
          message,
        });
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
    const methods = activeSocialMfaMethods(credentials);
    if (methods.length === 0) {
      return { status: 'skipped', reason: 'no_methods' };
    }
    return { status: 'ok', methods };
  } catch (listError) {
    Logger.error(
      listError instanceof Error ? listError : new Error(String(listError)),
      {
        tags: {
          feature: 'mfa',
          operation: reason.operation,
          phase: 'refreshSocialLoginCredentials',
        },
      },
    );
    return { status: 'skipped', reason: 'list_failed' };
  }
};

/**
 * Pre-password social recovery MFA using locked-state Auth APIs.
 *
 * Lists factors with `refreshSocialLoginCredentials`, then opens passkey when
 * available. On dismiss/cancel/failure, returns `fallback` so the host can show
 * the full-screen recovery picker (not the accounts-kit bottomsheet). Call only
 * while the vault is still locked.
 */
export const verifySocialLoginWhileLocked = async (
  reason: MfaReason,
): Promise<VerifySocialLoginWhileLockedResult> => {
  const listed = await listLockedSocialMethods(reason);
  if (listed.status === 'skipped') {
    return listed;
  }
  const { methods } = listed;

  // Only auto-open OS passkey. Otherwise → full-screen fallback (+ password).
  if (!methods.includes('passkey')) {
    return { status: 'fallback', methods };
  }

  try {
    const result = await startLockedVerify(reason, {
      methods: ['passkey'],
      verifyWith: 'passkey',
    });
    return { status: 'verified', result };
  } catch (primaryError) {
    // Cancel or hard failure — still offer full-screen alternatives.
    Logger.log('verifySocialLoginWhileLocked: passkey → fallback', {
      methods,
      code: getMfaErrorCode(primaryError),
    });
    return { status: 'fallback', methods };
  }
};

/** Verify one enrolled factor while locked (full-screen fallback path). */
export const verifySocialLoginFactorWhileLocked = async (
  reason: MfaReason,
  method: MfaMethod,
): Promise<VerifySocialLoginWhileLockedResult> => {
  try {
    const result = await startLockedVerify(reason, {
      methods: [method],
      verifyWith: method,
    });
    return { status: 'verified', result };
  } catch (error) {
    if (getMfaErrorCode(error) === 'flow_cancelled') {
      return { status: 'cancelled' };
    }
    return { status: 'failed', error };
  }
};
