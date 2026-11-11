import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectCardActiveProviderId,
} from '../../../../selectors/cardController';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { CardActions, withCardProvider } from '../util/metrics';
import { withBiometricAuth } from '../util/withBiometricAuth';
import useAuthentication from '../../../../core/Authentication/hooks/useAuthentication';
import useCardDetailsToken from './useCardDetailsToken';
import type {
  CardProviderCapabilities,
  CardSensitiveDetails,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardType } from '../types';
import ClipboardManager from '../../../../core/ClipboardManager';

interface UseRevealCardDetailsParams {
  cardType?: CardType;
  capabilities: CardProviderCapabilities | null;
}

export function useRevealCardDetails({
  cardType,
  capabilities,
}: UseRevealCardDetailsParams) {
  const navigation = useNavigation<AppNavigationProp>();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { reauthenticate } = useAuthentication();

  const {
    fetchCardDetailsToken,
    isLoading: isCardDetailsLoading,
    isImageLoading: isCardDetailsImageLoading,
    onImageLoad: onCardDetailsImageLoad,
    imageUrl: cardDetailsImageUrl,
    clearImageUrl: clearCardDetailsImageUrl,
  } = useCardDetailsToken();

  const [cardSensitiveDetails, setCardSensitiveDetails] =
    useState<CardSensitiveDetails | null>(null);
  const [isSensitiveDetailsLoading, setIsSensitiveDetailsLoading] =
    useState(false);

  const clearCardSensitiveDetails = useCallback(() => {
    setCardSensitiveDetails(null);
  }, []);

  const clearCardDetails = useCallback(() => {
    clearCardSensitiveDetails();
    clearCardDetailsImageUrl();
  }, [clearCardSensitiveDetails, clearCardDetailsImageUrl]);

  useEffect(() => () => clearCardDetails(), [clearCardDetails]);

  const copyCardDetail = useCallback((value: string) => {
    ClipboardManager.setString(value);
    toast({
      title: strings('card.card_home.card_details.copied'),
      severity: ToastSeverity.Default,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, []);

  const showCardDetailsErrorToast = useCallback(() => {
    toast({
      title: strings('card.card_home.view_card_details_error'),
      severity: ToastSeverity.Warning,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, []);

  const onCardDetailsImageError = useCallback(() => {
    clearCardDetailsImageUrl();
    showCardDetailsErrorToast();
  }, [clearCardDetailsImageUrl, showCardDetailsErrorToast]);

  const trackViewDetails = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.VIEW_CARD_DETAILS_BUTTON,
            card_type: cardType,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, activeProviderId, cardType]);

  const trackHideDetails = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.HIDE_CARD_DETAILS_BUTTON,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, activeProviderId]);

  const fetchAndShowCardDetails = useCallback(async () => {
    trackViewDetails();
    try {
      await fetchCardDetailsToken(cardType);
    } catch {
      showCardDetailsErrorToast();
    }
  }, [
    fetchCardDetailsToken,
    showCardDetailsErrorToast,
    cardType,
    trackViewDetails,
  ]);

  const fetchAndShowSensitiveDetails = useCallback(async () => {
    trackViewDetails();
    setIsSensitiveDetailsLoading(true);
    try {
      const details =
        await Engine.context.CardController.getCardSensitiveDetails();
      setCardSensitiveDetails(details);
    } catch {
      showCardDetailsErrorToast();
    } finally {
      setIsSensitiveDetailsLoading(false);
    }
  }, [showCardDetailsErrorToast, trackViewDetails]);

  const isDetailsVisible = Boolean(cardSensitiveDetails || cardDetailsImageUrl);
  const isDetailsLoading =
    isSensitiveDetailsLoading ||
    isCardDetailsLoading ||
    isCardDetailsImageLoading;

  const revealCardDetails = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }

    if (isDetailsVisible || isDetailsLoading) {
      return;
    }

    if (capabilities?.supportsSensitiveDetailsView) {
      await withBiometricAuth({
        reauthenticate,
        navigation,
        onSuccess: () => fetchAndShowSensitiveDetails(),
      });
      return;
    }

    await withBiometricAuth({
      reauthenticate,
      navigation,
      onSuccess: () => fetchAndShowCardDetails(),
    });
  }, [
    isAuthenticated,
    isDetailsVisible,
    isDetailsLoading,
    capabilities?.supportsSensitiveDetailsView,
    reauthenticate,
    navigation,
    fetchAndShowSensitiveDetails,
    fetchAndShowCardDetails,
  ]);

  const hideCardDetails = useCallback(() => {
    if (!isDetailsVisible) {
      return;
    }
    trackHideDetails();
    clearCardDetails();
  }, [isDetailsVisible, trackHideDetails, clearCardDetails]);

  const viewCardDetailsAction = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }

    if (capabilities?.supportsSensitiveDetailsView) {
      if (isSensitiveDetailsLoading) return;
      if (cardSensitiveDetails) {
        hideCardDetails();
        return;
      }
      await withBiometricAuth({
        reauthenticate,
        navigation,
        onSuccess: () => fetchAndShowSensitiveDetails(),
      });
      return;
    }

    if (isCardDetailsLoading || isCardDetailsImageLoading) return;
    if (cardDetailsImageUrl) {
      hideCardDetails();
      return;
    }
    await withBiometricAuth({
      reauthenticate,
      navigation,
      onSuccess: () => fetchAndShowCardDetails(),
    });
  }, [
    isAuthenticated,
    capabilities?.supportsSensitiveDetailsView,
    isSensitiveDetailsLoading,
    cardSensitiveDetails,
    hideCardDetails,
    fetchAndShowSensitiveDetails,
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    cardDetailsImageUrl,
    reauthenticate,
    fetchAndShowCardDetails,
    navigation,
  ]);

  return {
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    onCardDetailsImageLoad,
    cardDetailsImageUrl,
    onCardDetailsImageError,
    cardSensitiveDetails,
    isSensitiveDetailsLoading,
    isDetailsVisible,
    isDetailsLoading,
    clearCardDetails,
    clearCardSensitiveDetails,
    copyCardDetail,
    revealCardDetails,
    hideCardDetails,
    viewCardDetailsAction,
  };
}

export default useRevealCardDetails;
