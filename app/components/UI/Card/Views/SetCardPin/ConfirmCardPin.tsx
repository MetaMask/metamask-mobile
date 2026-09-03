import React, { useCallback, useContext, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import {
  ButtonIconVariant,
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useTheme } from '../../../../../util/theme';
import CardScreenshotDeterrent from '../../components/CardScreenshotDeterrent/CardScreenshotDeterrent';
import { CardActions, CardScreens } from '../../util/metrics';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { PIN_LENGTH, validateCardPin } from './validatePin';
import { classifySetCardPinError } from './classifySetCardPinError';
import { clearPinDraft, getPinDraft } from './pinDraftStore';
import { usePinEntry } from './hooks/usePinEntry';
import PinEntryLayout from './components/PinEntryLayout';

const PROVIDER = CardProviderIds.Immersve;

const ConfirmCardPin: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { cardId } = useParams<{ cardId: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const [isPending, setIsPending] = React.useState(false);
  const [isTerminalForbidden, setIsTerminalForbidden] = React.useState(false);
  const submittingRef = React.useRef(false);

  const {
    value: confirmPin,
    revealedIndex,
    isError,
    errorMessage,
    isInputLocked,
    handleKeypadChange,
    triggerError,
    lockWithError,
    resetToEmpty,
  } = usePinEntry({
    disabled: isPending || isTerminalForbidden,
  });

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.CONFIRM_PIN,
          provider: PROVIDER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    if (!getPinDraft()) {
      navigation.goBack();
    }
  }, [navigation]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearPinDraft();
        resetToEmpty();
        navigation.navigate(Routes.CARD.SET_PIN, { cardId });
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [cardId, navigation, resetToEmpty]);

  const handleAuthFailure = useCallback(async () => {
    clearPinDraft();
    resetToEmpty();
    try {
      await Engine.context.CardController.logout();
    } catch {
      // Continue to auth even if logout fails.
    }
    navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
  }, [navigation, resetToEmpty]);

  const handleBack = useCallback(() => {
    if (submittingRef.current || isPending) {
      return;
    }
    clearPinDraft();
    setIsTerminalForbidden(false);
    resetToEmpty();
    navigation.goBack();
  }, [isPending, navigation, resetToEmpty]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || isPending || isInputLocked) {
      return;
    }

    const draftPin = getPinDraft();
    if (!draftPin) {
      navigation.goBack();
      return;
    }

    if (draftPin !== confirmPin) {
      triggerError(strings('card.set_pin.mismatch_error'), () => {
        clearPinDraft();
        navigation.navigate(Routes.CARD.SET_PIN, { cardId });
      });
      return;
    }

    const validation = validateCardPin(draftPin);
    if (!validation.valid) {
      triggerError(strings('card.set_pin.invalid_pin_error'), () => {
        clearPinDraft();
        navigation.navigate(Routes.CARD.SET_PIN, { cardId });
      });
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
      await Engine.context.CardController.setCardPin(cardId, draftPin);
      clearPinDraft();
      resetToEmpty();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.CONFIRM_PIN_SUBMIT,
            provider: PROVIDER,
            status: 'succeeded',
          })
          .build(),
      );
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings('card.set_pin.success_title') }],
        descriptionOptions: {
          description: strings('card.set_pin.success_description'),
        },
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => toastRef?.current?.closeToast(),
        },
      });
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
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
        clearPinDraft();
        resetToEmpty();
        setIsTerminalForbidden(true);
        lockWithError(strings('card.set_pin.forbidden_error'));
        return;
      }

      if (kind === 'invalid_pin') {
        triggerError(strings('card.set_pin.invalid_pin_error'), () => {
          clearPinDraft();
          navigation.navigate(Routes.CARD.SET_PIN, { cardId });
        });
        return;
      }

      triggerError(strings('card.set_pin.network_error'));
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: 'immersve' },
        context: {
          name: 'ConfirmCardPin',
          data: { method: 'handleSubmit', httpStatus, errorCode },
        },
      });
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }, [
    isPending,
    isInputLocked,
    confirmPin,
    cardId,
    navigation,
    triggerError,
    lockWithError,
    resetToEmpty,
    trackEvent,
    createEventBuilder,
    handleAuthFailure,
    toastRef,
    theme,
  ]);

  const canSubmit =
    confirmPin.length === PIN_LENGTH &&
    !isTerminalForbidden &&
    !isInputLocked &&
    !isPending;

  return (
    <>
      <PinEntryLayout
        testID={SetCardPinSelectors.CONFIRM_ROOT}
        title={strings('card.set_pin.confirm_title')}
        description={strings('card.set_pin.confirm_description')}
        accessibilityLabel={strings('card.set_pin.confirm_label')}
        value={confirmPin}
        revealedIndex={revealedIndex}
        isError={isError || isTerminalForbidden}
        errorMessage={errorMessage}
        headerMode="back"
        onBackPress={handleBack}
        ctaLabel={strings('card.set_pin.submit')}
        ctaTestID={SetCardPinSelectors.SUBMIT_BUTTON}
        ctaDisabled={!canSubmit}
        ctaLoading={isPending}
        onCtaPress={() => {
          handleSubmit().catch(() => undefined);
        }}
        keypadDisabled={isPending || isInputLocked || isTerminalForbidden}
        onKeypadChange={handleKeypadChange}
      />
      <CardScreenshotDeterrent enabled />
    </>
  );
};

export default ConfirmCardPin;
