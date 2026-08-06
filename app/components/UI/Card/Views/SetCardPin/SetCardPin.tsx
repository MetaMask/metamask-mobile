import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import CardScreenshotDeterrent from '../../components/CardScreenshotDeterrent/CardScreenshotDeterrent';
import { CardActions, CardScreens } from '../../util/metrics';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { PIN_LENGTH, validateCardPin } from './validatePin';
import { classifySetCardPinError } from './classifySetCardPinError';

type SetPinStep = 'set' | 'confirm' | 'success';

const PROVIDER = CardProviderIds.Immersve;

const SetCardPin: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { cardId } = useParams<{ cardId: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [step, setStep] = useState<SetPinStep>('set');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isTerminalForbidden, setIsTerminalForbidden] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const submittingRef = useRef(false);

  const clearPins = useCallback(() => {
    setPin('');
    setConfirmPin('');
  }, []);

  useEffect(() => {
    const screen =
      step === 'set'
        ? CardScreens.SET_PIN
        : step === 'confirm'
          ? CardScreens.CONFIRM_PIN
          : CardScreens.SET_PIN_SUCCESS;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen, provider: PROVIDER })
        .build(),
    );
  }, [step, trackEvent, createEventBuilder]);

  useEffect(
    () => () => {
      clearPins();
    },
    [clearPins],
  );

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearPins();
        setInlineError(null);
        if (step !== 'success') {
          setStep('set');
        }
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [clearPins, step]);

  const digitsOnly = useCallback(
    (value: string) => value.replace(/\D/g, ''),
    [],
  );

  const handlePinChange = useCallback(
    (value: string) => {
      const next = digitsOnly(value).slice(0, PIN_LENGTH);
      setPin(next);
      if (next.length === PIN_LENGTH && !validateCardPin(next).valid) {
        setInlineError(strings('card.set_pin.repeating_pin_error'));
      } else {
        setInlineError(null);
      }
    },
    [digitsOnly],
  );

  const handleConfirmPinChange = useCallback(
    (value: string) => {
      setInlineError(null);
      setConfirmPin(digitsOnly(value).slice(0, PIN_LENGTH));
    },
    [digitsOnly],
  );

  const handleContinueFromSet = useCallback(() => {
    const validation = validateCardPin(pin);
    if (!validation.valid) {
      setInlineError(strings('card.set_pin.repeating_pin_error'));
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.SET_PIN_CONTINUE,
          provider: PROVIDER,
        })
        .build(),
    );
    setConfirmPin('');
    setInlineError(null);
    setStep('confirm');
  }, [pin, trackEvent, createEventBuilder]);

  const handleAuthFailure = useCallback(async () => {
    clearPins();
    try {
      await Engine.context.CardController.logout();
    } catch {
      // Continue to auth even if logout fails.
    }
    navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
  }, [clearPins, navigation]);

  const handleSubmitConfirm = useCallback(async () => {
    if (submittingRef.current || isPending) {
      return;
    }

    if (pin !== confirmPin) {
      setInlineError(strings('card.set_pin.mismatch_error'));
      clearPins();
      setStep('set');
      return;
    }

    const validation = validateCardPin(pin);
    if (!validation.valid) {
      setInlineError(strings('card.set_pin.invalid_pin_error'));
      clearPins();
      setStep('set');
      return;
    }

    submittingRef.current = true;
    setIsPending(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CONFIRM_PIN_SUBMIT,
          provider: PROVIDER,
        })
        .build(),
    );

    try {
      await Engine.context.CardController.setCardPin(cardId, pin);
      clearPins();
      setInlineError(null);
      setStep('success');
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.SET_PIN_SUCCESS_DONE,
            provider: PROVIDER,
            status: 'succeeded',
          })
          .build(),
      );
    } catch (error) {
      const kind = classifySetCardPinError(error);
      const httpStatus =
        error && typeof error === 'object' && 'statusCode' in error
          ? (error as { statusCode?: number }).statusCode
          : undefined;
      const errorCode =
        error && typeof error === 'object' && 'errorCode' in error
          ? (error as { errorCode?: string }).errorCode
          : undefined;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.CONFIRM_PIN_SUBMIT,
            provider: PROVIDER,
            status: 'failed',
            httpStatus,
            errorCode,
          })
          .build(),
      );

      if (kind === 'auth') {
        await handleAuthFailure();
        return;
      }

      if (kind === 'forbidden') {
        clearPins();
        setIsTerminalForbidden(true);
        setInlineError(strings('card.set_pin.forbidden_error'));
        return;
      }

      if (kind === 'invalid_pin') {
        setInlineError(strings('card.set_pin.invalid_pin_error'));
        clearPins();
        setStep('set');
        return;
      }

      setInlineError(strings('card.set_pin.network_error'));
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: 'immersve' },
        context: {
          name: 'SetCardPin',
          data: { method: 'handleSubmitConfirm', httpStatus, errorCode },
        },
      });
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }, [
    pin,
    confirmPin,
    isPending,
    cardId,
    clearPins,
    trackEvent,
    createEventBuilder,
    handleAuthFailure,
  ]);

  const handleDone = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.SET_PIN_SUCCESS_DONE,
          provider: PROVIDER,
        })
        .build(),
    );
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation, trackEvent, createEventBuilder]);

  const canContinueFromSet =
    pin.length === PIN_LENGTH && validateCardPin(pin).valid;
  const canSubmitConfirm =
    confirmPin.length === PIN_LENGTH && !isTerminalForbidden;

  if (step === 'success') {
    return (
      <Box testID={SetCardPinSelectors.ROOT} twClassName="flex-1">
        <OnboardingStep
          title={strings('card.set_pin.success_title')}
          description={strings('card.set_pin.success_description')}
          headerMode="close-reset-home"
          stickyActions
          formFields={<Box testID={SetCardPinSelectors.SUCCESS_TITLE} />}
          actions={
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleDone}
              testID={SetCardPinSelectors.DONE_BUTTON}
            >
              {strings('card.set_pin.success_done')}
            </Button>
          }
        />
      </Box>
    );
  }

  if (step === 'confirm') {
    return (
      <Box testID={SetCardPinSelectors.ROOT} twClassName="flex-1">
        <OnboardingStep
          title={strings('card.set_pin.confirm_title')}
          description={strings('card.set_pin.confirm_description')}
          headerMode="back"
          stickyActions
          formFields={
            <Box>
              <TextField
                onChangeText={handleConfirmPinChange}
                value={confirmPin}
                isError={!!inlineError}
                isDisabled={isPending || isTerminalForbidden}
                autoFocus
                inputProps={{
                  keyboardType: 'number-pad',
                  maxLength: PIN_LENGTH,
                  secureTextEntry: true,
                  accessibilityLabel: strings('card.set_pin.confirm_label'),
                  testID: SetCardPinSelectors.CONFIRM_PIN_FIELD,
                }}
              />
              {inlineError ? (
                <Text
                  variant={TextVariant.BodySm}
                  testID={SetCardPinSelectors.INLINE_ERROR}
                  twClassName="text-error-default mt-2"
                >
                  {inlineError}
                </Text>
              ) : null}
            </Box>
          }
          actions={
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!canSubmitConfirm || isPending}
              isLoading={isPending}
              onPress={() => {
                handleSubmitConfirm().catch(() => undefined);
              }}
              testID={SetCardPinSelectors.SUBMIT_BUTTON}
            >
              {strings('card.set_pin.submit')}
            </Button>
          }
        />
        <CardScreenshotDeterrent enabled />
      </Box>
    );
  }

  return (
    <Box testID={SetCardPinSelectors.ROOT} twClassName="flex-1">
      <OnboardingStep
        title={strings('card.set_pin.set_title')}
        description={strings('card.set_pin.set_description')}
        headerMode="back"
        stickyActions
        formFields={
          <Box>
            <TextField
              onChangeText={handlePinChange}
              value={pin}
              isError={!!inlineError}
              autoFocus
              inputProps={{
                keyboardType: 'number-pad',
                maxLength: PIN_LENGTH,
                secureTextEntry: true,
                accessibilityLabel: strings('card.set_pin.set_label'),
                testID: SetCardPinSelectors.PIN_FIELD,
              }}
            />
            {inlineError ? (
              <Text
                variant={TextVariant.BodySm}
                testID={SetCardPinSelectors.INLINE_ERROR}
                twClassName="text-error-default mt-2"
              >
                {inlineError}
              </Text>
            ) : null}
          </Box>
        }
        actions={
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!canContinueFromSet}
            onPress={handleContinueFromSet}
            testID={SetCardPinSelectors.CONTINUE_BUTTON}
          >
            {strings('card.set_pin.continue')}
          </Button>
        }
      />
      <CardScreenshotDeterrent enabled />
    </Box>
  );
};

export default SetCardPin;
