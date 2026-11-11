import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectCardActiveProviderId,
} from '../../../../selectors/cardController';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
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
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
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

  const copyCardDetail = useCallback(
    (value: string) => {
      ClipboardManager.setString(value);
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_home.card_details.copied') },
        ],
        iconName: IconName.Copy,
        iconColor: theme.colors.icon.default,
        hasNoTimeout: false,
      });
    },
    [toastRef, theme],
  );

  const showCardDetailsErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_home.view_card_details_error') },
      ],
      hasNoTimeout: false,
      iconName: IconName.Warning,
    });
  }, [toastRef]);

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
        toastRef,
        onSuccess: () => fetchAndShowSensitiveDetails(),
      });
      return;
    }

    await withBiometricAuth({
      reauthenticate,
      navigation,
      toastRef,
      onSuccess: () => fetchAndShowCardDetails(),
    });
  }, [
    isAuthenticated,
    isDetailsVisible,
    isDetailsLoading,
    capabilities?.supportsSensitiveDetailsView,
    reauthenticate,
    navigation,
    toastRef,
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
        toastRef,
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
      toastRef,
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
    toastRef,
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
