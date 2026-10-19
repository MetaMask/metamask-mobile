import React, { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import CardScreenshotDeterrent from '../../components/CardScreenshotDeterrent/CardScreenshotDeterrent';
import { CardActions, CardScreens } from '../../util/metrics';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { PIN_LENGTH, validateCardPin } from './validatePin';
import { clearPinDraft, setPinDraft } from './pinDraftStore';
import { usePinEntry } from './hooks/usePinEntry';
import PinEntryLayout from './components/PinEntryLayout';

const PROVIDER = CardProviderIds.Immersve;

const SetCardPin: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { cardId } = useParams<{ cardId: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const {
    value: pin,
    revealedIndex,
    isError,
    errorMessage,
    isInputLocked,
    handleKeypadChange,
    triggerError,
    resetToEmpty,
  } = usePinEntry();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen: CardScreens.SET_PIN, provider: PROVIDER })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearPinDraft();
        resetToEmpty();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [resetToEmpty]);

  const handleContinue = useCallback(() => {
    if (isInputLocked) {
      return;
    }

    const validation = validateCardPin(pin);
    if (!validation.valid) {
      triggerError(
        validation.reason === 'repeating'
          ? strings('card.set_pin.repeating_pin_error')
          : strings('card.set_pin.invalid_pin_error'),
      );
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
    setPinDraft(pin);
    resetToEmpty();
    navigation.navigate(Routes.CARD.CONFIRM_PIN, { cardId });
  }, [
    pin,
    isInputLocked,
    triggerError,
    trackEvent,
    createEventBuilder,
    resetToEmpty,
    navigation,
    cardId,
  ]);

  const canContinue = pin.length === PIN_LENGTH && !isInputLocked;

  return (
    <>
      <PinEntryLayout
        testID={SetCardPinSelectors.ROOT}
        title={strings('card.set_pin.set_title')}
        description={strings('card.set_pin.set_description')}
        accessibilityLabel={strings('card.set_pin.set_label')}
        value={pin}
        revealedIndex={revealedIndex}
        isError={isError}
        errorMessage={errorMessage}
        headerMode="back"
        ctaLabel={strings('card.set_pin.continue')}
        ctaTestID={SetCardPinSelectors.CONTINUE_BUTTON}
        ctaDisabled={!canContinue}
        onCtaPress={handleContinue}
        keypadDisabled={isInputLocked}
        onKeypadChange={handleKeypadChange}
      />
      <CardScreenshotDeterrent enabled />
    </>
  );
};

export default SetCardPin;
