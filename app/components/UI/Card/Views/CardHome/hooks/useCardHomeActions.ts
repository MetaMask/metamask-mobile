import { useCallback, useContext, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { selectIsCardAuthenticated } from '../../../../../../selectors/cardController';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import { CardActions } from '../../../util/metrics';
import { DEPOSIT_SUPPORTED_TOKENS } from '../../../constants';
import { toCardTokenAllowance } from '../../../util/toCardTokenAllowance';
import { withBiometricAuth } from '../../../util/withBiometricAuth';
import { createAddFundsModalNavigationDetails } from '../../../components/AddFundsBottomSheet/AddFundsBottomSheet';
import { createAssetSelectionModalNavigationDetails } from '../../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { createViewPinBottomSheetNavigationDetails } from '../../../components/ViewPinBottomSheet';
import { buildShippingAddress } from '../../../util/buildUserAddress';
import useAuthentication from '../../../../../../core/Authentication/hooks/useAuthentication';
import useCardFreeze from '../../../hooks/useCardFreeze';
import useCardDetailsToken from '../../../hooks/useCardDetailsToken';
import useCardPinToken from '../../../hooks/useCardPinToken';
import { useOpenSwaps } from '../../../hooks/useOpenSwaps';
import { useNavigateToCardPage } from '../../../hooks/useNavigateToCardPage';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import type {
  CardTokenAllowance,
  DelegationSettingsResponse,
} from '../../../types';

function buildSpendingLimitParams(data: CardHomeData | null | undefined) {
  const allTokens = (data?.supportedTokens ?? []).map(toCardTokenAllowance);
  const priorityToken = data?.primaryAsset
    ? toCardTokenAllowance(data.primaryAsset)
    : null;
  const delegationSettings: DelegationSettingsResponse | null =
    data?.delegationSettings ?? null;
  const externalWalletDetailsData = {
    walletDetails: [] as never[],
    mappedWalletDetails: (data?.assets ?? []).map(toCardTokenAllowance),
    priorityWalletDetail: priorityToken ?? undefined,
  };
  return {
    allTokens,
    priorityToken,
    delegationSettings,
    externalWalletDetailsData,
  };
}

interface UseCardHomeActionsParams {
  data: CardHomeData | null | undefined;
  legacyPriorityToken: CardTokenAllowance | null;
  isFrozen: boolean;
}

export function useCardHomeActions({
  data,
  legacyPriorityToken,
  isFrozen,
}: UseCardHomeActionsParams) {
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { reauthenticate } = useAuthentication();

  const { navigateToCardPage, navigateToTravelPage, navigateToCardTosPage } =
    useNavigateToCardPage(navigation);
  const { freeze, unfreeze } = useCardFreeze(data?.card?.id);
  const {
    fetchCardDetailsToken,
    isLoading: isCardDetailsLoading,
    isImageLoading: isCardDetailsImageLoading,
    onImageLoad: onCardDetailsImageLoad,
    imageUrl: cardDetailsImageUrl,
    clearImageUrl: clearCardDetailsImageUrl,
  } = useCardDetailsToken();
  const {
    generatePinToken,
    isLoading: isPinLoading,
    reset: resetPinToken,
  } = useCardPinToken();
  const { openSwaps } = useOpenSwaps({ priorityToken: legacyPriorityToken });

  const spendingLimitParams = useMemo(
    () => buildSpendingLimitParams(data),
    [data],
  );

  // --- Freeze ---

  const showFreezeSuccessToast = useCallback(
    (wasFrozen: boolean) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings(
              wasFrozen
                ? 'card.card_home.manage_card_options.unfreeze_success'
                : 'card.card_home.manage_card_options.freeze_success',
            ),
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    },
    [toastRef, theme],
  );

  const handleToggleFreeze = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }

    const wasFrozen = isFrozen;

    if (!isFrozen) {
      freeze.mutate(undefined, {
        onSuccess: () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
              .addProperties({ action: CardActions.FREEZE_CARD_BUTTON })
              .build(),
          );
          showFreezeSuccessToast(wasFrozen);
        },
      });
      return;
    }

    await withBiometricAuth({
      reauthenticate,
      navigation,
      toastRef,
      passwordDescription: strings(
        'card.password_bottomsheet.description_unfreeze',
      ),
      onSuccess: () => {
        unfreeze.mutate(undefined, {
          onSuccess: () => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
                .addProperties({ action: CardActions.UNFREEZE_CARD_BUTTON })
                .build(),
            );
            showFreezeSuccessToast(wasFrozen);
          },
        });
      },
    });
  }, [
    isAuthenticated,
    isFrozen,
    freeze,
    unfreeze,
    reauthenticate,
    navigation,
    trackEvent,
    createEventBuilder,
    toastRef,
    showFreezeSuccessToast,
  ]);

  // --- Card details ---

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

  const fetchAndShowCardDetails = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VIEW_CARD_DETAILS_BUTTON,
          card_type: data?.card?.type,
        })
        .build(),
    );
    try {
      await fetchCardDetailsToken(data?.card?.type);
    } catch {
      showCardDetailsErrorToast();
    }
  }, [
    fetchCardDetailsToken,
    showCardDetailsErrorToast,
    data?.card?.type,
    trackEvent,
    createEventBuilder,
  ]);

  const viewCardDetailsAction = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }
    if (isCardDetailsLoading || isCardDetailsImageLoading) return;
    if (cardDetailsImageUrl) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({ action: CardActions.HIDE_CARD_DETAILS_BUTTON })
          .build(),
      );
      clearCardDetailsImageUrl();
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
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    cardDetailsImageUrl,
    clearCardDetailsImageUrl,
    reauthenticate,
    fetchAndShowCardDetails,
    navigation,
    toastRef,
    trackEvent,
    createEventBuilder,
  ]);

  // --- PIN ---

  const fetchAndShowPin = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.VIEW_PIN_BUTTON })
        .build(),
    );
    try {
      const response = await generatePinToken();
      navigation.navigate(
        ...createViewPinBottomSheetNavigationDetails({
          imageUrl: response.url,
        }),
      );
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.card_home.manage_card_options.view_pin_error'),
          },
        ],
        hasNoTimeout: false,
        iconName: IconName.Warning,
      });
    } finally {
      resetPinToken();
    }
  }, [
    generatePinToken,
    navigation,
    toastRef,
    resetPinToken,
    trackEvent,
    createEventBuilder,
  ]);

  const viewPinAction = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }
    if (isPinLoading) return;
    await withBiometricAuth({
      reauthenticate,
      navigation,
      toastRef,
      passwordDescription: strings(
        'card.password_bottomsheet.description_view_pin',
      ),
      onSuccess: () => fetchAndShowPin(),
    });
  }, [
    isAuthenticated,
    isPinLoading,
    reauthenticate,
    fetchAndShowPin,
    navigation,
    toastRef,
  ]);

  // --- Navigation actions ---

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
    );
    const isPriorityTokenSupportedDeposit = !!DEPOSIT_SUPPORTED_TOKENS.find(
      (t) => t.toLowerCase() === data?.primaryAsset?.symbol?.toLowerCase(),
    );

    if (isPriorityTokenSupportedDeposit) {
      navigation.navigate(
        ...createAddFundsModalNavigationDetails({
          priorityToken: legacyPriorityToken ?? undefined,
        }),
      );
    } else if (data?.primaryAsset) {
      openSwaps({});
    }
  }, [
    trackEvent,
    createEventBuilder,
    data?.primaryAsset,
    legacyPriorityToken,
    openSwaps,
    navigation,
  ]);

  const changeAssetAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.CHANGE_ASSET_BUTTON })
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(
        ...createAssetSelectionModalNavigationDetails({
          tokensWithAllowances: spendingLimitParams.allTokens,
          delegationSettings: spendingLimitParams.delegationSettings,
          cardExternalWalletDetails:
            spendingLimitParams.externalWalletDetailsData,
        }),
      );
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    spendingLimitParams,
  ]);

  const enableCardAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.OPEN_ONBOARDING_DELEGATION_FLOW })
        .build(),
    );
    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'manage',
      priorityToken: spendingLimitParams.priorityToken,
      allTokens: spendingLimitParams.allTokens,
      delegationSettings: spendingLimitParams.delegationSettings,
      externalWalletDetailsData: spendingLimitParams.externalWalletDetailsData,
    });
  }, [navigation, trackEvent, createEventBuilder, spendingLimitParams]);

  const manageSpendingLimitAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.MANAGE_SPENDING_LIMIT_BUTTON })
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
        flow: 'enable',
        priorityToken: spendingLimitParams.priorityToken,
        allTokens: spendingLimitParams.allTokens,
        delegationSettings: spendingLimitParams.delegationSettings,
        externalWalletDetailsData:
          spendingLimitParams.externalWalletDetailsData,
      });
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    spendingLimitParams,
  ]);

  const logoutAction = useCallback(() => {
    Alert.alert(
      strings('card.card_home.logout_confirmation_title'),
      strings('card.card_home.logout_confirmation_message'),
      [
        {
          text: strings('card.card_home.logout_confirmation_cancel'),
          style: 'cancel',
        },
        {
          text: strings('card.card_home.logout_confirmation_confirm'),
          style: 'destructive',
          onPress: async () => {
            await Engine.context.CardController.logout();
            navigation.goBack();
          },
        },
      ],
    );
  }, [navigation]);

  const orderMetalCardAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.ORDER_METAL_CARD_BUTTON })
        .build(),
    );
    navigation.navigate(Routes.CARD.CHOOSE_YOUR_CARD, {
      flow: 'upgrade',
      shippingAddress: data?.account?.shippingAddress
        ? buildShippingAddress({
            addressLine1: data.account.shippingAddress.line1,
            addressLine2: data.account.shippingAddress.line2 ?? null,
            city: data.account.shippingAddress.city,
            usState: data.account.shippingAddress.state ?? null,
            zip: data.account.shippingAddress.postalCode,
          } as never)
        : undefined,
    });
  }, [
    navigation,
    trackEvent,
    createEventBuilder,
    data?.account?.shippingAddress,
  ]);

  const cashbackAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.CASHBACK_BUTTON })
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.CASHBACK);
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [isAuthenticated, navigation, trackEvent, createEventBuilder]);

  return {
    freeze,
    unfreeze,
    handleToggleFreeze,
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    onCardDetailsImageLoad,
    cardDetailsImageUrl,
    onCardDetailsImageError,
    viewCardDetailsAction,
    isPinLoading,
    viewPinAction,
    addFundsAction,
    changeAssetAction,
    enableCardAction,
    manageSpendingLimitAction,
    logoutAction,
    orderMetalCardAction,
    cashbackAction,
    navigateToCardPage,
    navigateToTravelPage,
    navigateToCardTosPage,
  };
}
