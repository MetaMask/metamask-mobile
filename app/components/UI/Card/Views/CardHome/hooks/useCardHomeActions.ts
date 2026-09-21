import { useCallback, useContext } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../../util/navigation/navUtils';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectCardActiveProviderId,
} from '../../../../../../selectors/cardController';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  CardActions,
  CardEntryPoint,
  withCardProvider,
} from '../../../util/metrics';
import { DEPOSIT_SUPPORTED_TOKENS, cardNetworkInfos } from '../../../constants';
import { withBiometricAuth } from '../../../util/withBiometricAuth';
import { createAddFundsModalNavigationDetails } from '../../../components/AddFundsBottomSheet/AddFundsBottomSheet';
import { createAssetSelectionModalNavigationDetails } from '../../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { createViewPinBottomSheetNavigationDetails } from '../../../components/ViewPinBottomSheet';
import { buildShippingAddress } from '../../../util/buildUserAddress';
import useAuthentication from '../../../../../../core/Authentication/hooks/useAuthentication';
import useCardFreeze from '../../../hooks/useCardFreeze';
import useCardPinToken from '../../../hooks/useCardPinToken';
import { useRevealCardDetails } from '../../../hooks/useRevealCardDetails';
import { useOpenSwaps } from '../../../hooks/useOpenSwaps';
import { useNavigateToCardPage } from '../../../hooks/useNavigateToCardPage';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import type {
  CardHomeData,
  CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardFundingTokenWithBalance } from '../../../types';

interface UseCardHomeActionsParams {
  data: CardHomeData | null | undefined;
  primaryToken: CardFundingTokenWithBalance | null;
  isFrozen: boolean;
  cardTermsAndConditionsUrl: string;
  capabilities: CardProviderCapabilities | null;
}

export function useCardHomeActions({
  data,
  primaryToken,
  isFrozen,
  cardTermsAndConditionsUrl,
  capabilities,
}: UseCardHomeActionsParams) {
  const navigation = useNavigation<AppNavigationProp>();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { reauthenticate } = useAuthentication();

  const { navigateToTravelPage, navigateToCardTosPage } = useNavigateToCardPage(
    navigation,
    cardTermsAndConditionsUrl,
  );
  const { freeze, unfreeze } = useCardFreeze(data?.card?.id);
  const {
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    onCardDetailsImageLoad,
    cardDetailsImageUrl,
    onCardDetailsImageError,
    cardSensitiveDetails,
    isSensitiveDetailsLoading,
    clearCardSensitiveDetails,
    copyCardDetail,
    viewCardDetailsAction,
  } = useRevealCardDetails({
    cardType: data?.card?.type,
    capabilities,
  });
  const {
    generatePinToken,
    isLoading: isPinLoading,
    reset: resetPinToken,
  } = useCardPinToken();
  const { openSwaps } = useOpenSwaps({ priorityToken: primaryToken });

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const evmAccount = selectAccountByScope('eip155:0');
  const solanaAccount = selectAccountByScope(
    cardNetworkInfos.solana.caipChainId,
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
              .addProperties(
                withCardProvider(activeProviderId, {
                  action: CardActions.FREEZE_CARD_BUTTON,
                }),
              )
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
                .addProperties(
                  withCardProvider(activeProviderId, {
                    action: CardActions.UNFREEZE_CARD_BUTTON,
                  }),
                )
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
    activeProviderId,
    toastRef,
    showFreezeSuccessToast,
  ]);

  // --- PIN ---

  const fetchAndShowPin = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.VIEW_PIN_BUTTON,
          }),
        )
        .build(),
    );
    try {
      const response = await generatePinToken();
      navigateWithDetails(
        navigation,
        createViewPinBottomSheetNavigationDetails({
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
    activeProviderId,
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

  const setPinAction = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
      return;
    }
    const cardId = data?.card?.id;
    if (!cardId) {
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.SET_PIN_BUTTON,
          }),
        )
        .build(),
    );
    await withBiometricAuth({
      reauthenticate,
      navigation,
      toastRef,
      passwordDescription: strings(
        'card.password_bottomsheet.description_set_pin',
      ),
      onSuccess: () => {
        navigation.navigate(Routes.CARD.SET_PIN, { cardId });
      },
    });
  }, [
    isAuthenticated,
    data?.card?.id,
    activeProviderId,
    reauthenticate,
    navigation,
    toastRef,
    trackEvent,
    createEventBuilder,
  ]);

  // --- Navigation actions ---

  const switchToFundingAccountIfNeeded = useCallback(() => {
    const walletAddress = data?.primaryFundingAsset?.walletAddress;
    if (!walletAddress) return;

    const isAlreadySelected =
      walletAddress.toLowerCase() === evmAccount?.address?.toLowerCase() ||
      walletAddress === solanaAccount?.address;

    if (isAlreadySelected) return;

    Engine.setSelectedAddress(walletAddress);
  }, [
    data?.primaryFundingAsset?.walletAddress,
    evmAccount?.address,
    solanaAccount?.address,
  ]);

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED)
        .addProperties(withCardProvider(activeProviderId))
        .build(),
    );

    if (primaryToken?.isMoneyAccountEntry) {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
      return;
    }

    const isPriorityTokenSupportedDeposit = !!DEPOSIT_SUPPORTED_TOKENS.find(
      (t) =>
        t.toLowerCase() === data?.primaryFundingAsset?.symbol?.toLowerCase(),
    );

    if (isPriorityTokenSupportedDeposit) {
      switchToFundingAccountIfNeeded();
      navigateWithDetails(
        navigation,
        createAddFundsModalNavigationDetails({
          priorityToken: primaryToken ?? undefined,
        }),
      );
    } else if (data?.primaryFundingAsset) {
      switchToFundingAccountIfNeeded();
      openSwaps({});
    }
  }, [
    trackEvent,
    createEventBuilder,
    activeProviderId,
    data?.primaryFundingAsset,
    primaryToken,
    openSwaps,
    navigation,
    switchToFundingAccountIfNeeded,
  ]);

  const changeAssetAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.CHANGE_ASSET_BUTTON,
          }),
        )
        .build(),
    );
    if (isAuthenticated) {
      navigateWithDetails(
        navigation,
        createAssetSelectionModalNavigationDetails({}),
      );
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    activeProviderId,
  ]);

  const enableCardAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.OPEN_ONBOARDING_DELEGATION_FLOW,
          }),
        )
        .build(),
    );
    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'enable_card',
    });
  }, [navigation, trackEvent, createEventBuilder, activeProviderId]);

  const manageSpendingLimitAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.MANAGE_SPENDING_LIMIT_BUTTON,
          }),
        )
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
        flow: 'manage',
      });
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    activeProviderId,
  ]);

  const contactDetailsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.CONTACT_DETAILS_BUTTON,
          }),
        )
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.CONTACT_DETAILS);
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, {
        showAuthPrompt: true,
        postAuthRedirect: { screen: Routes.CARD.CONTACT_DETAILS },
      });
    }
  }, [
    activeProviderId,
    createEventBuilder,
    isAuthenticated,
    navigation,
    trackEvent,
  ]);

  const digitalWalletInstructionsAction = useCallback(() => {
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.DIGITAL_WALLET_INSTRUCTIONS,
    });
  }, [navigation]);

  const unlinkMoneyAccountAction = useCallback(
    (fundingSource?: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(activeProviderId, {
              action: CardActions.UNLINK_MONEY_ACCOUNT_BUTTON,
            }),
          )
          .build(),
      );
      navigation.navigate(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT,
        params: {
          fundingSource,
          entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
        },
      });
    },
    [navigation, trackEvent, createEventBuilder, activeProviderId],
  );

  const revokeAllowanceAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.REVOKE_ALLOWANCE_BUTTON,
          }),
        )
        .build(),
    );
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.REVOKE_ALLOWANCE,
      params: {
        entrypoint: CardEntryPoint.CARD_HOME_REVOKE_ALLOWANCE,
      },
    });
  }, [navigation, trackEvent, createEventBuilder, activeProviderId]);

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
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.ORDER_METAL_CARD_BUTTON,
          }),
        )
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
    activeProviderId,
    data?.account?.shippingAddress,
  ]);

  const cashbackAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.CASHBACK_BUTTON,
            type: 'open_redeem',
          }),
        )
        .build(),
    );
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.CASHBACK);
    } else {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { showAuthPrompt: true });
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    activeProviderId,
  ]);

  const redeemCreditAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.CREDIT_BUTTON,
            type: 'open_redeem',
          }),
        )
        .build(),
    );
    navigation.navigate(Routes.CARD.CREDIT_REDEEM);
  }, [navigation, trackEvent, createEventBuilder, activeProviderId]);

  const transactionHistoryAction = useCallback(
    (destination: 'card' | 'money') => {
      if (destination === 'money') {
        navigation.navigate(Routes.HOME_TABS, {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.ACTIVITY },
        });
        return;
      }

      if (isAuthenticated) {
        navigation.navigate(Routes.CARD.TRANSACTION_HISTORY);
      } else {
        navigation.navigate(Routes.CARD.AUTHENTICATION, {
          showAuthPrompt: true,
          postAuthRedirect: { screen: Routes.CARD.TRANSACTION_HISTORY },
        });
      }
    },
    [isAuthenticated, navigation],
  );

  return {
    freeze,
    unfreeze,
    handleToggleFreeze,
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    onCardDetailsImageLoad,
    cardDetailsImageUrl,
    onCardDetailsImageError,
    cardSensitiveDetails,
    isSensitiveDetailsLoading,
    clearCardSensitiveDetails,
    copyCardDetail,
    viewCardDetailsAction,
    isPinLoading,
    viewPinAction,
    setPinAction,
    addFundsAction,
    changeAssetAction,
    enableCardAction,
    manageSpendingLimitAction,
    contactDetailsAction,
    digitalWalletInstructionsAction,
    unlinkMoneyAccountAction,
    revokeAllowanceAction,
    logoutAction,
    orderMetalCardAction,
    cashbackAction,
    redeemCreditAction,
    transactionHistoryAction,
    navigateToTravelPage,
    navigateToCardTosPage,
  };
}
