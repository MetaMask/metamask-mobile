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
    // OAuth can navigate here a beat before Seedless social state is ready.
    // Retry briefly when Auth still reports no social login / no token.
    const maxAttempts = 5;
    let credentials: EnrolledCredential[] = [];
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        credentials = await controller.refreshEnrolledCredentials();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
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
    if (lastError) {
      throw lastError;
    }
    const methods = activeSocialMfaMethods(credentials);
    Logger.log('verifySocialLoginWhileLocked: listed methods', {
      methodCount: methods.length,
      methods,
    });
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
 * Pre-password social recovery MFA using Mathieu's locked-state Auth APIs.
 *
 * Lists factors with `refreshSocialLoginCredentials`, then opens the highest-
 * priority factor (usually passkey). On dismiss/cancel, returns `fallback`
 * so the host can show the full-screen recovery picker — not the
 * accounts-kit bottomsheet. Call only while the vault is still locked.
 *
 * @param reason - Feature reason for Auth traces / analytics.
 * @returns Outcome so the host can continue to password unlock or full-screen fallback.
 */
export const verifySocialLoginWhileLocked = async (
  reason: MfaReason,
): Promise<VerifySocialLoginWhileLockedResult> => {
  const listed = await listLockedSocialMethods(reason);
  if (listed.status === 'skipped') {
    return listed;
  }
  const { methods } = listed;

  // Only auto-open OS passkey. No passkey → full-screen fallback
  // (methods + Use password). Never auto-launch totp/email.
  if (!methods.includes('passkey')) {
    Logger.log(
      'verifySocialLoginWhileLocked: no passkey → full-screen fallback',
      { methods },
    );
    return { status: 'fallback', methods };
  }

  const request: Omit<VerifyOrEnrollOptions, 'reason'> = {
    methods: ['passkey'],
    verifyWith: 'passkey',
  };

  try {
    Logger.log('verifySocialLoginWhileLocked: primary factor', {
      primary: 'passkey',
      methods,
    });
    const result = await startLockedVerify(reason, request);
    return { status: 'verified', result };
  } catch (primaryError) {
    const code = getMfaErrorCode(primaryError);
    if (code === 'flow_cancelled') {
      // Host shows full-screen Verify it's you (not kit bottomsheet).
      Logger.log('verifySocialLoginWhileLocked: passkey cancelled → fallback', {
        methods,
      });
      return { status: 'fallback', methods };
    }
    // Hard failure on passkey — still offer full-screen alternatives.
    Logger.log('verifySocialLoginWhileLocked: passkey failed → fallback', {
      methods,
      code,
    });
    return { status: 'fallback', methods };
  }
};

/**
 * Verify one enrolled factor while locked (from the full-screen fallback).
 * Does not open the kit method picker.
 */
export const verifySocialLoginFactorWhileLocked = async (
  reason: MfaReason,
  method: MfaMethod,
): Promise<VerifySocialLoginWhileLockedResult> => {
  try {
    Logger.log('verifySocialLoginFactorWhileLocked: method', { method });
    const result = await startLockedVerify(reason, {
      methods: [method],
      verifyWith: method,
    });
    return { status: 'verified', result };
  } catch (error) {
    const code = getMfaErrorCode(error);
    if (code === 'flow_cancelled') {
      return { status: 'cancelled' };
    }
    return { status: 'failed', error };
  }
};
