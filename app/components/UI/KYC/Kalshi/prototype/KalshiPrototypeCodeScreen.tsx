// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CodeStep, {
  type CodeStepPartnerProps,
} from '../../../../Views/Mfa/MfaFlowHost/steps/CodeStep';
import { maskEmail } from '../../../../Views/Mfa/labels';
import type {
  MfaFlowAction,
  MfaFlowErrorCode,
} from '../../../../../util/identity/mfa/engine/types';
import {
  GEORGE_COPY,
  PROTOTYPE_CODE_CHECK_DELAY_MS,
  PROTOTYPE_COPY,
  PROTOTYPE_EMAIL,
} from './prototypeConstants';
import KalshiWordmark from './KalshiWordmark';

/** Which partner code the screen enters. */
export type KalshiPrototypeCodeChannel = 'email' | 'phone';

interface KalshiPrototypeCodeScreenProps {
  /** The channel the code arrived over. */
  channel: KalshiPrototypeCodeChannel;
  /** Checks the code; rejects with kyc-api's error when it is wrong. */
  onSubmit: (code: string) => Promise<void>;
  /** Sends a new code; the phone code has no resend of its own. */
  onResend?: () => Promise<boolean | void>;
  /** Leaves the screen. */
  onBack: () => void;
  /** The address the email code went to; the fake account's by default. */
  email?: string;
  /** The number the phone code went to, as the user entered it. */
  phoneNumber?: string;
  /** Opens the screen for entering a different email. */
  onUseDifferentEmail?: () => void;
  /** Hides "Use my Kalshi email", once the user has already entered it. */
  hideUseDifferentEmail?: boolean;
}

/**
 * The Kalshi email and phone code screens, built on the shared MFA code-entry
 * view. Both carry the Kalshi wordmark in the header and Kalshi's own copy,
 * left-aligned like MetaMask's MFA code screen. The email screen adds the
 * "Use my Kalshi email" way as a full-width secondary button under the
 * resend button. Codes are faked; the checked code is the prototype's.
 *
 * @param props - The channel and the fake actions.
 * @returns The screen.
 */
const KalshiPrototypeCodeScreen = ({
  channel,
  onSubmit,
  onResend,
  onBack,
  email: enteredEmail = PROTOTYPE_EMAIL,
  phoneNumber = PROTOTYPE_COPY.phoneCodeFallbackNumber,
  onUseDifferentEmail,
  hideUseDifferentEmail = false,
}: KalshiPrototypeCodeScreenProps) => {
  const tw = useTailwind();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MfaFlowErrorCode>();
  const [resentCount, setResentCount] = useState(0);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      clearTimeout(submitTimer.current);
    },
    [],
  );

  const isEmail = channel === 'email';
  const email = isEmail ? enteredEmail : undefined;
  // Kalshi's code copy, with the fake email address masked the way the shared
  // view masks it.
  const description = isEmail
    ? PROTOTYPE_COPY.emailCode.body.replace(
        '{maskedEmail}',
        maskEmail(enteredEmail),
      )
    : PROTOTYPE_COPY.phoneCode.body.replace('{phoneNumber}', phoneNumber);

  const partner: CodeStepPartnerProps = {
    // Kalshi's copy on both screens, under its wordmark in the header.
    title: isEmail
      ? PROTOTYPE_COPY.emailCode.title
      : PROTOTYPE_COPY.phoneCode.title,
    useDifferentEmail:
      isEmail && !hideUseDifferentEmail
        ? {
            label: PROTOTYPE_COPY.useDifferentEmail,
            // To the email entry screen, or back when there is none.
            onPress: onUseDifferentEmail ?? onBack,
            // The full-width secondary button under the resend button.
            asButton: true,
          }
        : undefined,
    description,
    // George's copy for a refused code, from his `kalshiErrors.ts`.
    errorMessage: GEORGE_COPY.codeRefused,
  };

  // The step and state the shared view reads, fabricated for the fake flow.
  const step = {
    name: 'otp' as const,
    purpose: 'verify' as const,
    method: 'email_otp' as const,
    email,
    codeSent: true,
  };
  const state = {
    step,
    busy,
    error,
    codeResent: resentCount > 0,
    progress: { current: 1, total: 1 },
  };

  const onAction = useCallback(
    (action: MfaFlowAction) => {
      if (action.type === 'submitCode') {
        // Clearing first mirrors the real flow, where every attempt starts
        // from no error: a second refusal must re-show the message.
        setBusy(true);
        setError(undefined);
        clearTimeout(submitTimer.current);
        submitTimer.current = setTimeout(() => {
          onSubmit(action.code)
            .catch(() => setError('invalid_code'))
            .finally(() => setBusy(false));
        }, PROTOTYPE_CODE_CHECK_DELAY_MS);
        return;
      }
      if (action.type === 'resend' && onResend) {
        setError(undefined);
        // A failed send shows its own dialog and leaves the boxes as they are.
        onResend()
          .then((sent) => {
            if (sent !== false) {
              setResentCount((count) => count + 1);
            }
          })
          .catch(() => setError('invalid_code'));
      }
    },
    [onResend, onSubmit],
  );

  return (
    <Box style={tw.style('flex-1 bg-default')}>
      <HeaderStandard
        title={<KalshiWordmark />}
        onBack={onBack}
        includesTopInset
        backButtonProps={{ testID: 'kalshi-prototype-code-back' }}
      />
      <CodeStep
        // A resend starts the boxes over, like a fresh challenge would.
        key={`${channel}-${resentCount}`}
        step={step}
        state={state}
        reason={{ operation: 'ukyc.kalshi.verifyEmail', presentation: 'card' }}
        onAction={onAction}
        partner={partner}
      />
    </Box>
  );
};

export default KalshiPrototypeCodeScreen;
