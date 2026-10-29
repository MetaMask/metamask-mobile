import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import useScreenTransitionComplete from '../../../../hooks/useScreenTransitionComplete';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import SignInOtpFields, {
  CODE_LENGTH,
} from '../CardAuthentication/components/SignInOtpFields';
import {
  classifyImmersveMfaError,
  useImmersveMfa,
} from '../../hooks/useImmersveMfa';
import { getSiweErrorType } from '../../hooks/useImmersveSiweAuth';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import type { CardMfaCodeParams } from './types';

const CardMfaCode = () => {
  const params = useParams<CardMfaCodeParams>();
  const { country, address, maskedDestination, expiresAt } = params;
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isSubmitting, submitCode, restart, goToNextStep } = useImmersveMfa();

  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(
    () => expiresAt !== null && Date.now() >= expiresAt,
  );
  const [expiredMessage, setExpiredMessage] = useState(() =>
    strings('card.mfa.errors.code_expired'),
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.MFA_CODE,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    if (expiresAt === null) return;
    const markIfExpired = () => {
      if (Date.now() >= expiresAt) {
        setExpiredMessage(strings('card.mfa.errors.code_expired'));
        setExpired(true);
      }
    };
    markIfExpired();
    const remaining = expiresAt - Date.now();
    const timer =
      remaining > 0 ? setTimeout(markIfExpired, remaining) : undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') markIfExpired();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [expiresAt]);

  useEffect(() => {
    if (!expired) return;
    AccessibilityInfo.announceForAccessibility(expiredMessage);
  }, [expired, expiredMessage]);

  const handleRestart = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.MFA_RESTART,
          }),
        )
        .build(),
    );
    try {
      const result = await restart(country, address);
      await goToNextStep(result, params);
    } catch (restartError) {
      if (getSiweErrorType(restartError) === 'user_cancelled') return;
      setExpiredMessage(getCardProviderErrorMessage(restartError));
      setExpired(true);
    }
  }, [
    address,
    country,
    createEventBuilder,
    goToNextStep,
    params,
    restart,
    trackEvent,
  ]);

  const handleSubmitCode = useCallback(
    async (code: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.MFA_CODE_CONFIRM,
            }),
          )
          .build(),
      );
      try {
        const result = await submitCode(code);
        await goToNextStep(result, params);
      } catch (submitError) {
        const kind = classifyImmersveMfaError(submitError);
        if (kind === 'invalid_code') {
          setError(getCardProviderErrorMessage(submitError));
          setConfirmCode('');
          setLatestValueSubmitted(null);
          return;
        }
        if (kind === 'restart_required') {
          setExpiredMessage(getCardProviderErrorMessage(submitError));
          setExpired(true);
          setConfirmCode('');
          setLatestValueSubmitted(null);
          return;
        }
        setError(getCardProviderErrorMessage(submitError));
        setConfirmCode('');
        setLatestValueSubmitted(null);
      }
    },
    [createEventBuilder, goToNextStep, params, submitCode, trackEvent],
  );

  useEffect(() => {
    if (expired || isSubmitting) return;
    if (
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      handleSubmitCode(confirmCode);
    }
  }, [
    confirmCode,
    expired,
    handleSubmitCode,
    isSubmitting,
    latestValueSubmitted,
  ]);

  const formFields = expired ? (
    <Text
      variant={TextVariant.BodyMd}
      twClassName="text-text-alternative"
      testID="card-mfa-code-expired"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {expiredMessage}
    </Text>
  ) : (
    <SignInOtpFields
      confirmCode={confirmCode}
      error={error}
      otpError={null}
      resendCooldown={0}
      otpLoading={isSubmitting}
      isScreenTransitionComplete={isScreenTransitionComplete}
      resendLabel={strings('card.mfa.start_over')}
      onChangeCode={(text) => {
        const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
        setConfirmCode(cleaned);
        setError(null);
        setLatestValueSubmitted((current) =>
          current === cleaned ? current : null,
        );
      }}
      onResend={handleRestart}
    />
  );

  const actions = expired ? (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={handleRestart}
      isFullWidth
      isLoading={isSubmitting}
      testID="card-mfa-code-start-over"
    >
      {strings('card.mfa.start_over')}
    </Button>
  ) : (
    <Box />
  );

  return (
    <OnboardingStep
      title={strings('card.mfa.code_title')}
      description={strings('card.mfa.code_description', {
        destination: maskedDestination,
      })}
      formFields={formFields}
      actions={actions}
      stickyActions
      headerMode="back"
    />
  );
};

export default CardMfaCode;
