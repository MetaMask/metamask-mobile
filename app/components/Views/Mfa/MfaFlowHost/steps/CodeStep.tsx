import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextButton,
  TextColor,
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
import { hasTestOverrides } from '../../../../../util/test/utils';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { StepError, type StepProps } from './StepLayout';

const CELL_COUNT = 6;
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
  const isCoolingDown = secondsLeft > 0;

  // iOS can leave the input focused with no keyboard (for example when it
  // was focused during the modal transition); a tap alone does not reopen it.
  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    if (input.isFocused() && !Keyboard.isVisible()) {
      input.blur();
      requestAnimationFrame(() => input.focus());
      return;
    }
    input.focus();
  }, [inputRef]);

  useEffect(() => {
    if (error || codeResent) {
      setCode('');
      focusInput();
    }
  }, [error, codeResent, focusInput]);

  // The first code of a flow can hit the cooldown left by the previous one.
  useEffect(() => {
    if (!codeSent && resendAvailableAt !== undefined && secondsLeft === 0) {
      onAction({ type: 'resend' });
    }
  }, [codeSent, resendAvailableAt, secondsLeft, onAction]);

  const submit = useCallback(
    (value: string) => onAction({ type: 'submitCode', code: value }),
    [onAction],
  );

  useEffect(() => {
    if (codeSent) {
      focusInput();
    }
  }, [codeSent, focusInput]);

  const handleChange = (text: string) => {
    if (busy && codeSent) {
      return;
    }
    const digits = text.replace(/\D/g, '').slice(0, CELL_COUNT);
    setCode(digits);
    if (codeSent && digits.length === CELL_COUNT) {
      submit(digits);
    }
  };

  const renderResend = () => {
    if (isCoolingDown || (busy && !codeSent)) {
      let label = strings('mfa.otp.sending');
      if (isCoolingDown) {
        label = strings(codeSent ? 'mfa.otp.resend_in' : 'mfa.otp.send_in', {
          seconds: secondsLeft,
        });
      }
      return (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
      );
    }
    return (
      <TextButton
        onPress={() => onAction({ type: 'resend' })}
        testID={MfaFlowSelectorsIDs.RESEND_BUTTON}
      >
        {strings('mfa.otp.resend')}
      </TextButton>
    );
  };

  const showError =
    error !== undefined && !(isCoolingDown && COOLDOWN_CODES.has(error));

  return (
    <StepLayout
      title={strings('mfa.otp.title')}
      description={
        step.email
          ? strings('mfa.otp.description_with_email', { email: step.email })
          : strings('mfa.otp.description')
      }
      footer={
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={busy && codeSent}
          isDisabled={!codeSent || code.length !== CELL_COUNT}
          onPress={() => submit(code)}
          testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
        >
          {strings('mfa.otp.submit')}
        </Button>
      }
    >
      <CodeField
        ref={inputRef as React.RefObject<TextInput>}
        {...cellProps}
        value={code}
        onChangeText={handleChange}
        cellCount={CELL_COUNT}
        rootStyle={tw.style('gap-2')}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        onPressIn={focusInput}
        testID={MfaFlowSelectorsIDs.CODE_INPUT}
        renderCell={({ index, symbol, isFocused }) => (
          <View
            key={index}
            onLayout={getCellOnLayoutHandler(index)}
            style={tw.style(
              'flex-1 h-14 items-center justify-center rounded-lg border bg-muted',
              isFocused ? 'border-primary-default' : 'border-muted',
            )}
          >
            <Text variant={TextVariant.HeadingMd}>
              {symbol || (isFocused && !hasTestOverrides ? <Cursor /> : null)}
            </Text>
          </View>
        )}
      />
      {showError && error ? <StepError code={error} /> : null}
      {codeResent && !error ? (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('mfa.otp.resent')}
        </Text>
      ) : null}
      <Box twClassName="flex-row">{renderResend()}</Box>
    </StepLayout>
  );
};

export default CodeStep;
