import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';

import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../locales/i18n';
import type { KalshiDemoOnboarding } from './useKalshiDemoOnboarding';
import { KalshiDemoOnboardingTestIds as TestIds } from './KalshiDemoOnboarding.testIds';

/** Kalshi demo accepts this email code (ISV spec A.4). Editable. */
export const DEMO_EMAIL_CODE = '888888';

const t = (key: string, params?: Record<string, string>) =>
  strings(`predict_next.kalshi_demo_onboarding.${key}`, params);

interface KalshiDemoOnboardingModalProps {
  onboarding: KalshiDemoOnboarding;
  walletAddress?: string;
  network: string;
}

/** Disables the buttons for `Retry-After` seconds after a rate limit. */
const useCooldown = (cooldownSec: number | undefined): boolean => {
  const [coolingDown, setCoolingDown] = useState(false);
  useEffect(() => {
    if (!cooldownSec) {
      setCoolingDown(false);
      return undefined;
    }
    setCoolingDown(true);
    const timer = setTimeout(() => setCoolingDown(false), cooldownSec * 1000);
    return () => clearTimeout(timer);
  }, [cooldownSec]);
  return coolingDown;
};

/**
 * Temporary demo onboarding sheet (mobile plan §1). No designs exist, so it
 * uses design-system parts only. Presentational: every action goes through
 * the state machine.
 */
export const KalshiDemoOnboardingModal = ({
  onboarding,
  walletAddress,
  network,
}: KalshiDemoOnboardingModalProps) => {
  const { state } = onboarding;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(DEMO_EMAIL_CODE);
  const coolingDown = useCooldown(state.cooldownSec);
  const disabled = state.busy || coolingDown;

  const message = state.message ? (
    <Text
      variant={TextVariant.BodySm}
      color={
        state.step === 'done' ? TextColor.TextDefault : TextColor.ErrorDefault
      }
      testID={TestIds.MESSAGE}
    >
      {t(`errors.${state.message}`)}
    </Text>
  ) : null;

  const renderStep = () => {
    switch (state.step) {
      case 'email':
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>{t('email_title')}</Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder={t('email_label')}
              isDisabled={state.busy}
              inputProps={{
                autoCapitalize: 'none',
                autoComplete: 'email',
                keyboardType: 'email-address',
                accessibilityLabel: t('email_label'),
              }}
              testID={TestIds.EMAIL_INPUT}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {t('email_note')}
            </Text>
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || email.trim().length === 0}
              onPress={() => onboarding.submitEmail(email)}
              testID={TestIds.CONTINUE}
            >
              {t('continue')}
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.NOT_NOW}
            >
              {t('not_now')}
            </Button>
          </>
        );
      case 'code':
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>{t('code_title')}</Text>
            <TextField
              value={code}
              onChangeText={setCode}
              placeholder={t('code_label')}
              isDisabled={state.busy}
              inputProps={{
                keyboardType: 'number-pad',
                autoComplete: 'one-time-code',
                accessibilityLabel: t('code_label'),
              }}
              testID={TestIds.CODE_INPUT}
            />
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || !/^[0-9]{6,8}$/u.test(code.trim())}
              onPress={() => onboarding.verifyCode(code)}
              testID={TestIds.VERIFY}
            >
              {t('verify')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={disabled}
              onPress={onboarding.resendCode}
              testID={TestIds.RESEND}
            >
              {t('resend')}
            </Button>
          </>
        );
      case 'working':
        return (
          <Box twClassName="items-center gap-3 py-6" testID={TestIds.WORKING}>
            <ActivityIndicator />
            <Text variant={TextVariant.BodyMd}>{t('working')}</Text>
          </Box>
        );
      case 'wallet':
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>{t('wallet_title')}</Text>
            {walletAddress ? (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                testID={TestIds.WALLET_ADDRESS}
              >
                {t('wallet_description', { address: walletAddress, network })}
              </Text>
            ) : (
              <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
                {t('wallet_missing')}
              </Text>
            )}
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || !walletAddress}
              onPress={onboarding.activate}
              testID={TestIds.ACTIVATE}
            >
              {t('activate')}
            </Button>
          </>
        );
      case 'done':
        return (
          <>
            <Text variant={TextVariant.BodyMd} testID={TestIds.DONE}>
              {t('done')}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.CLOSE}
            >
              {t('close')}
            </Button>
          </>
        );
      case 'error':
        return (
          <>
            {message}
            {state.retryable ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={disabled}
                onPress={onboarding.retry}
                testID={TestIds.TRY_AGAIN}
              >
                {t('try_again')}
              </Button>
            ) : null}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.CLOSE}
            >
              {t('close')}
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onboarding.dismiss}
    >
      <ModalSafeAreaProvider>
        <BottomSheet onClose={onboarding.dismiss} testID={TestIds.SHEET}>
          <Box twClassName="gap-4 px-4 pb-4 pt-2">{renderStep()}</Box>
        </BottomSheet>
      </ModalSafeAreaProvider>
    </Modal>
  );
};
