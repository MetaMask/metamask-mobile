import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HelpText,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { strings } from '../../../../../../locales/i18n';
import { getErrorHandling } from '../../../../../util/identity/mfa/engine/errors';
import { hasTestOverrides } from '../../../../../util/test/utils';
import { maskEmail } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { StepError, type StepProps } from './StepLayout';

const CELL_COUNT = 6;
/**
 * Keeps the digits of typed or pasted text, up to a full code.
 *
 * @param text - What was typed or pasted.
 * @returns The code's digits.
 */
const getCodeDigits = (text: string) =>
  text.replace(/\D/g, '').slice(0, CELL_COUNT);

const COOLDOWN_CODES = new Set(['otp_resend_cooldown', 'rate_limited']);

// The clock is state, as the React Compiler caches what render computes:
// `Date.now()` read during render would never move. Being up to a second
// behind never reads 0 for a cooldown that just started, so the auto-send
// below cannot fire early.
const useSecondsUntil = (at?: number) => {
  const [now, tick] = useReducer(() => Date.now(), undefined, Date.now);
  useEffect(() => {
    // A recurring timer keeps the JS thread busy and stalls Detox.
    if (hasTestOverrides) {
      return undefined;
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return at === undefined ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
};

const CodeStep = ({ step, state, onAction }: StepProps<'otp'>) => {
  const tw = useTailwind();
  const [code, setCode] = useState('');
  const inputRef = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT });
  const [cellProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });
  const secondsLeft = useSecondsUntil(state.resendAvailableAt);
  const { busy, error, codeResent, resendAvailableAt } = state;
  const { codeSent } = step;
  // Authenticator app codes are on the user's app, so nothing is sent or
  // resent.
  const isTotp = step.method === 'totp';
  const isCoolingDown = secondsLeft > 0;

  // React Native ignores focus() on an input it considers focused, so a
  // keyboard hidden without a blur (Android's back button, switching apps to
  // copy the code, a modal transition on iOS) only comes back after one. A tap
  // always reopens it: `Keyboard.isVisible()` can be stale after an app
  // switch.
  const focusInput = useCallback(
    (isTap = false) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      if (input.isFocused() && (isTap || !Keyboard.isVisible())) {
        input.blur();
        requestAnimationFrame(() => input.focus());
        return;
      }
      input.focus();
    },
    [inputRef],
  );

  useEffect(() => {
    if (error || codeResent) {
      setCode('');
      focusInput();
    }
  }, [error, codeResent, focusInput]);

  // The first email code of a flow can hit the cooldown left by the previous
  // one.
  useEffect(() => {
    if (
      !isTotp &&
      !codeSent &&
      resendAvailableAt !== undefined &&
      secondsLeft === 0
    ) {
      onAction({ type: 'resend' });
    }
  }, [isTotp, codeSent, resendAvailableAt, secondsLeft, onAction]);

  // Submits a complete code once it was sent, so digits typed or pasted while
  // it was still sending are not left on screen.
  useEffect(() => {
    if (codeSent && code.length === CELL_COUNT) {
      onAction({ type: 'submitCode', code });
    }
  }, [codeSent, code, onAction]);

  useEffect(() => {
    if (codeSent) {
      focusInput();
    }
  }, [codeSent, focusInput]);

  const handleChange = (text: string) => {
    if (busy && codeSent) {
      return;
    }
    setCode(getCodeDigits(text));
  };

  const paste = async () => handleChange(await Clipboard.getString());

  // An email cooldown with a wait time shows as the countdown on the resend
  // button, also once it ended. Authenticator app errors always show.
  const showError =
    error !== undefined &&
    (isTotp || !(resendAvailableAt !== undefined && COOLDOWN_CODES.has(error)));
  // The code on screen can no longer be used: the main action is a new one.
  const needsNewCode =
    showError && error !== undefined && getErrorHandling(error) === 'restart';

  const getResendLabel = () => {
    if (isCoolingDown) {
      return strings(codeSent ? 'mfa.otp.resend_in' : 'mfa.otp.send_in', {
        seconds: secondsLeft,
      });
    }
    return strings(busy && !codeSent ? 'mfa.otp.sending' : 'mfa.otp.resend');
  };
  const canResend = !isCoolingDown && !busy;

  const getDescription = () => {
    if (isTotp) {
      return strings('mfa.otp.description_totp');
    }
    return step.email
      ? strings('mfa.otp.description_with_email', {
          email: maskEmail(step.email),
        })
      : strings('mfa.otp.description');
  };

  return (
    <StepLayout
      title={strings('mfa.otp.title')}
      description={getDescription()}
      footer={
        isTotp && !codeSent && !busy ? (
          // The verification failed to start: start it again, after any
          // cooldown.
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isCoolingDown}
            onPress={() => onAction({ type: 'resend' })}
            testID={MfaFlowSelectorsIDs.RESEND_BUTTON}
          >
            {isCoolingDown
              ? strings('mfa.otp.retry_in', { seconds: secondsLeft })
              : strings('mfa.otp.retry')}
          </Button>
        ) : isTotp ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            // A complete code is submitted as it is typed; this shows the
            // verification starting or the code being checked, or submits it
            // again after an error.
            isLoading={busy}
            isDisabled={!codeSent || code.length < CELL_COUNT}
            onPress={() => onAction({ type: 'submitCode', code })}
            testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
          >
            {strings('mfa.otp.verify')}
          </Button>
        ) : (
          <Button
            variant={
              canResend ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            size={ButtonSize.Lg}
            isFullWidth
            // No submit button: this shows the code being checked.
            isLoading={busy && codeSent}
            onPress={canResend ? () => onAction({ type: 'resend' }) : undefined}
            testID={MfaFlowSelectorsIDs.RESEND_BUTTON}
          >
            {needsNewCode ? strings('mfa.otp.get_new_code') : getResendLabel()}
          </Button>
        )
      }
    >
      <Box twClassName="gap-2">
        <Button
          variant={ButtonVariant.Tertiary}
          // The button aligns itself to the start; the design puts it at the end.
          twClassName="self-end px-0"
          onPress={paste}
          testID={MfaFlowSelectorsIDs.PASTE_BUTTON}
        >
          {strings('mfa.otp.paste')}
        </Button>
        <View>
          <CodeField
            ref={inputRef as React.RefObject<TextInput>}
            {...cellProps}
            // The hidden input covers the boxes and keeps the tap without
            // reopening the keyboard. The press layer below takes the tap.
            pointerEvents="none"
            value={code}
            onChangeText={handleChange}
            cellCount={CELL_COUNT}
            rootStyle={tw.style('gap-2')}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            testID={MfaFlowSelectorsIDs.CODE_INPUT}
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                onLayout={getCellOnLayoutHandler(index)}
                style={tw.style(
                  'flex-1 h-14 items-center justify-center rounded-xl border-[1.5px] bg-muted',
                  isFocused ? 'border-primary-default' : 'border-muted',
                )}
              >
                <Text variant={TextVariant.HeadingMd} twClassName="text-[22px]">
                  {symbol ||
                    (isFocused && !hasTestOverrides ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => focusInput(true)}
            onPressOut={cellProps.onPressOut}
            testID={MfaFlowSelectorsIDs.CODE_TAP_AREA}
          />
        </View>
        {showError && error ? (
          <StepError code={error} method={step.method} />
        ) : null}
        {codeResent && !error ? (
          <HelpText>{strings('mfa.otp.resent')}</HelpText>
        ) : null}
      </Box>
    </StepLayout>
  );
};

export default CodeStep;
