// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CodeStep, {
  type CodeStepPartnerProps,
} from '../../../../Views/Mfa/MfaFlowHost/steps/CodeStep';
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
import KalshiPrototypeLockup from './KalshiPrototypeLockup';

/** Which partner code the screen enters. */
export type KalshiPrototypeCodeChannel = 'email' | 'phone';

interface KalshiPrototypeCodeScreenProps {
  /** The channel the code arrived over. */
  channel: KalshiPrototypeCodeChannel;
  /** Checks the code; rejects with kyc-api's error when it is wrong. */
  onSubmit: (code: string) => Promise<void>;
  /** Sends a new code; the phone code has no resend of its own. */
  onResend?: () => Promise<void>;
  /** Leaves the screen. */
  onBack: () => void;
}

/**
 * The Kalshi email and phone code screens, built on the shared MFA code-entry
 * view with the partner variant on: the MetaMask x Kalshi lockup above the
 * title and the "Use a different email" link. Codes are faked; the checked
 * code is the prototype's.
 *
 * @param props - The channel and the fake actions.
 * @returns The screen.
 */
const KalshiPrototypeCodeScreen = ({
  channel,
  onSubmit,
  onResend,
  onBack,
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
  const email = isEmail ? PROTOTYPE_EMAIL : undefined;
  // George's code screens read "Check your email"; the phone's description
  // carries his phone-code copy without the demo value the fake ignores.
  const description = isEmail ? undefined : GEORGE_COPY.phoneCode.body;

  const partner: CodeStepPartnerProps = {
    lockup: <KalshiPrototypeLockup />,
    useDifferentEmail: isEmail
      ? {
          label: PROTOTYPE_COPY.useDifferentEmail,
          onPress: () => undefined,
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
        onResend()
          .catch(() => setError('invalid_code'))
          .finally(() => setResentCount((count) => count + 1));
      }
    },
    [onResend, onSubmit],
  );

  return (
    <Box style={tw.style('flex-1 bg-default')}>
      <HeaderStandard
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
