import React, { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
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
const COOLDOWN_CODES = ['otp_resend_cooldown', 'rate_limited'];

const getSecondsUntil = (at?: number) =>
  at === undefined ? 0 : Math.max(0, Math.ceil((at - Date.now()) / 1000));

const useSecondsUntil = (at?: number) => {
  const [seconds, setSeconds] = useState(() => getSecondsUntil(at));
  useEffect(() => {
    setSeconds(getSecondsUntil(at));
    // A recurring timer keeps the JS thread busy and stalls Detox.
    if (at === undefined || hasTestOverrides) {
      return undefined;
    }
    const id = setInterval(() => {
      const next = getSecondsUntil(at);
      setSeconds(next);
      if (next === 0) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [at]);
  return seconds;
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

  useEffect(() => {
    if (error || codeResent) {
      setCode('');
      inputRef.current?.focus();
    }
  }, [error, codeResent, inputRef]);

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

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CELL_COUNT);
    setCode(digits);
    if (digits.length === CELL_COUNT) {
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
    error !== undefined && !(isCoolingDown && COOLDOWN_CODES.includes(error));

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
        autoComplete="one-time-code"
        autoFocus
        editable={codeSent && !busy}
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
