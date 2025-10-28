import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles from './CardHome.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import {
  selectSpendingLimitSettings,
  selectIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  selectShouldShowDelegationSuccessToast,
  setShouldShowDelegationSuccessToast,
} from '../../../../../core/redux/slices/card';
import { AllowanceState, CardType, CardWarning } from '../../types';
import { BAANX_MAX_LIMIT, DEPOSIT_SUPPORTED_TOKENS } from '../../constants';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import CardImage from '../../components/CardImage';
import SpendingLimitProgressBar from '../../components/SpendingLimitProgressBar/SpendingLimitProgressBar';
import SpendingLimitWarning from '../../components/SpendingLimitWarning';
import AssetSelectionBottomSheet, {
  AssetSelectionBottomSheetRef,
} from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { selectChainId } from '../../../../../selectors/networkController';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AddFundsBottomSheet from '../../components/AddFundsBottomSheet';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useCardSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import useIsBaanxLoginEnabled from '../../hooks/isBaanxLoginEnabled';
import useCardDetails from '../../hooks/useCardDetails';
import CardWarningBox from '../../components/CardWarningBox/CardWarningBox';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import Logger from '../../../../../util/Logger';

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (advanced management)
 *
 * @param props - Component props
 * @returns JSX element representing the card home screen
 */
const CardHome = () => {
  const { PreferencesController } = Engine.context;
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const [openAddFundsBottomSheet, setOpenAddFundsBottomSheet] = useState(false);
  const [openAssetSelectionBottomSheet, setOpenAssetSelectionBottomSheet] =
    useState(false);
  const [retries, setRetries] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSpendingLimitWarning, setShowSpendingLimitWarning] =
    useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);
  const assetSelectionBottomSheetRef =
    useRef<AssetSelectionBottomSheetRef>(null);
  const { logoutFromProvider, isLoading: isSDKLoading, sdk } = useCardSDK();
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: priorityTokenError,
    warning: priorityTokenWarning,
  } = useGetPriorityCardToken();
  const { balanceFiat, mainBalance, rawFiatNumber, rawTokenBalance, asset } =
    useAssetBalance(priorityToken);
  const {
    cardDetails,
    fetchCardDetails,
    isLoading: isLoadingCardDetails,
    error: cardDetailsError,
  } = useCardDetails();
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const spendingLimitSettings = useSelector(selectSpendingLimitSettings);
  const shouldShowSuccessToast = useSelector(
    selectShouldShowDelegationSuccessToast,
  );

  // Calculate if we should show the spending limit warning
  const shouldShowSpendingLimitWarning = useMemo(() => {
    // Don't show if full access is enabled or progress bar is hidden
    if (spendingLimitSettings.isFullAccess || !priorityToken?.allowance) {
      return false;
    }

    // Don't show if user has dismissed the warning
    if (warningDismissed) {
      return false;
    }

    // Calculate allowance usage percentage
    const totalLimit = parseFloat(spendingLimitSettings.limitAmount || '0');
    const currentAllowance = parseFloat(priorityToken.allowance || '0');
    const usagePercentage =
      totalLimit > 0 ? (currentAllowance / totalLimit) * 100 : 0;

    // Show warning if usage is 90% or more of total allowance
    return usagePercentage >= 90 && usagePercentage < 100;
  }, [spendingLimitSettings, priorityToken?.allowance, warningDismissed]);

  const { openSwaps } = useOpenSwaps({
    priorityToken,
  });
  const isSwapEnabledForPriorityToken = useIsSwapEnabledForPriorityToken(
    priorityToken?.walletAddress,
  );

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited = useMemo(
    () =>
      !isAuthenticated &&
      priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken, isAuthenticated],
  );

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return mainBalance;
    }

    return balanceFiat;
  }, [balanceFiat, mainBalance]);

  const renderAddFundsBottomSheet = useCallback(
    () => (
      <AddFundsBottomSheet
        sheetRef={sheetRef}
        setOpenAddFundsBottomSheet={setOpenAddFundsBottomSheet}
        priorityToken={priorityToken ?? undefined}
        chainId={selectedChainId}
        navigate={navigation.navigate}
      />
    ),
    [
      sheetRef,
      setOpenAddFundsBottomSheet,
      priorityToken,
      selectedChainId,
      navigation,
    ],
  );

  const hasTrackedCardHomeView = useRef(false);

  useEffect(() => {
    if (hasTrackedCardHomeView.current) {
      return;
    }

    if (isSDKLoading) {
      return;
    }

    const hasValidMainBalance =
      mainBalance !== undefined &&
      mainBalance !== TOKEN_BALANCE_LOADING &&
      mainBalance !== TOKEN_BALANCE_LOADING_UPPERCASE;

    const hasValidFiatBalance =
      balanceFiat !== undefined &&
      balanceFiat !== TOKEN_BALANCE_LOADING &&
      balanceFiat !== TOKEN_BALANCE_LOADING_UPPERCASE &&
      balanceFiat !== TOKEN_RATE_UNDEFINED;

    const isLoaded =
      !!priorityToken && (hasValidMainBalance || hasValidFiatBalance);

    if (isLoaded) {
      hasTrackedCardHomeView.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_HOME_VIEWED)
          .addProperties({
            token_symbol_priority: priorityToken?.symbol,
            token_raw_balance_priority:
              rawTokenBalance !== undefined && isNaN(rawTokenBalance)
                ? 0
                : rawTokenBalance,
            token_fiat_balance_priority:
              rawFiatNumber !== undefined && isNaN(rawFiatNumber)
                ? 0
                : rawFiatNumber,
          })
          .build(),
      );
    }
  }, [
    priorityToken,
    mainBalance,
    balanceFiat,
    rawTokenBalance,
    rawFiatNumber,
    trackEvent,
    createEventBuilder,
    isSDKLoading,
  ]);

  // Reset bottom sheet state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setOpenAssetSelectionBottomSheet(false);

      // Show success toast if needed
      if (shouldShowSuccessToast) {
        const displayAmount = spendingLimitSettings.isFullAccess
          ? 'Full access'
          : `${spendingLimitSettings.limitAmount} ${
              priorityToken?.symbol?.toUpperCase() || 'USDC'
            }`;

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          iconColor: theme.colors.primary.default,
          backgroundColor: theme.colors.background.default,
          labelOptions: [
            { label: 'Spending limit updated', isBold: true },
            { label: '\n', isBold: false },
            { label: displayAmount, isBold: false },
          ],
          closeButtonOptions: {
            variant: ButtonVariants.Primary,
            endIconName: IconName.CircleX,
            label: '',
            onPress: () => {
              toastRef?.current?.closeToast();
            },
          },
          hasNoTimeout: false,
        });

        dispatch(setShouldShowDelegationSuccessToast(false));
      }
    }, [
      shouldShowSuccessToast,
      priorityToken,
      toastRef,
      spendingLimitSettings,
      dispatch,
      theme,
    ]),
  );

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
    );
    const isPriorityTokenSupportedDeposit = !!DEPOSIT_SUPPORTED_TOKENS.find(
      (t) => t.toLowerCase() === priorityToken?.symbol?.toLowerCase(),
    );

    if (isPriorityTokenSupportedDeposit) {
      setOpenAddFundsBottomSheet(true);
    } else if (priorityToken) {
      openSwaps({
        chainId: selectedChainId,
      });
    }
  }, [
    trackEvent,
    createEventBuilder,
    priorityToken,
    openSwaps,
    selectedChainId,
  ]);

  const changeAssetAction = useCallback(() => {
    if (isAuthenticated) {
      // Show asset selection bottom sheet
      setOpenAssetSelectionBottomSheet(true);
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const manageSpendingLimitAction = useCallback(() => {
    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.SPENDING_LIMIT);
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const logoutAction = () => {
    logoutFromProvider();
    navigation.goBack();
  };

  const isLoading = useMemo(
    () => (isLoadingPriorityToken || isLoadingCardDetails) && !isInitialLoad,
    [isLoadingPriorityToken, isLoadingCardDetails, isInitialLoad],
  );
  const ButtonsSection = useMemo(() => {
    if (isLoading) {
      return (
        <Skeleton
          height={28}
          width={'100%'}
          style={styles.skeletonRounded}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
        />
      );
    }

    if (isBaanxLoginEnabled) {
      if (priorityTokenWarning === CardWarning.NeedDelegation) return null;

      return (
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Primary}
            style={
              !isSwapEnabledForPriorityToken
                ? styles.halfWidthButtonDisabled
                : styles.halfWidthButton
            }
            label={strings('card.card_home.add_funds')}
            size={ButtonSize.Lg}
            onPress={addFundsAction}
            width={ButtonWidthTypes.Full}
            disabled={!isSwapEnabledForPriorityToken}
            loading={isLoading}
            testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
          />
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.halfWidthButton}
            label={strings('card.card_home.change_asset')}
            size={ButtonSize.Lg}
            onPress={changeAssetAction}
            width={ButtonWidthTypes.Full}
            testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
          />
        </View>
      );
    }

    return (
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_home.add_funds')}
        size={ButtonSize.Lg}
        onPress={addFundsAction}
        width={ButtonWidthTypes.Full}
        loading={isLoading}
        testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
      />
    );
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addFundsAction,
    priorityTokenWarning,
    isLoading,
    isSwapEnabledForPriorityToken,
  ]);

  const error = useMemo(
    () => priorityTokenError || cardDetailsError,
    [priorityTokenError, cardDetailsError],
  );

  // Handle initial load with retry logic
  useEffect(() => {
    if (isInitialLoad && !isSDKLoading && sdk) {
      // Add a small delay to ensure everything is initialized
      const timer = setTimeout(async () => {
        try {
          // Retry logic for initial load
          const performRetry = async (maxRetries: number) => {
            for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
              try {
                await fetchPriorityToken();
                await fetchCardDetails();
                setIsInitialLoad(false);
                break; // Success, exit retry loop
              } catch (retryError) {
                Logger.log(
                  `Initial load attempt ${retryCount + 1} failed:`,
                  retryError,
                );

                if (retryCount < maxRetries - 1) {
                  // Wait before retrying
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * (retryCount + 1)),
                  );
                } else {
                  // Final attempt failed, but don't show error yet
                  Logger.log(
                    'All initial load attempts failed, will show error if needed',
                  );
                  setIsInitialLoad(false);
                }
              }
            }
          };

          await performRetry(3);
        } catch (initialLoadError) {
          Logger.log('Initial load failed completely:', initialLoadError);
          setIsInitialLoad(false);
        }
      }, 1000); // Increased delay to 1 second

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, isSDKLoading, sdk, fetchPriorityToken, fetchCardDetails]);

  // Show spending limit warning when conditions are met
  useEffect(() => {
    if (shouldShowSpendingLimitWarning && !showSpendingLimitWarning) {
      setShowSpendingLimitWarning(true);
    } else if (!shouldShowSpendingLimitWarning && showSpendingLimitWarning) {
      setShowSpendingLimitWarning(false);
    }
  }, [shouldShowSpendingLimitWarning, showSpendingLimitWarning]);

  // Reset dismissed state when spending limit changes significantly
  useEffect(() => {
    if (warningDismissed) {
      // Reset dismissed state when spending limit settings change
      setWarningDismissed(false);
    }
  }, [
    spendingLimitSettings.limitAmount,
    spendingLimitSettings.isFullAccess,
    warningDismissed,
  ]);

  // Show skeleton loading state during initial load
  if (isInitialLoad) {
    return (
      <ScrollView
        style={styles.wrapper}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.cardBalanceContainer}>
          {/* Balance skeleton */}
          <View
            style={[
              styles.balanceTextContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Skeleton
              height={28}
              width={'50%'}
              style={styles.skeletonRounded}
            />
          </View>

          {/* Card image skeleton */}
          <View
            style={[styles.cardImageContainer, styles.defaultHorizontalPadding]}
          >
            <Skeleton
              height={240}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          </View>

          {/* Asset item skeleton */}
          <View
            style={[
              styles.cardAssetItemContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Skeleton
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          </View>
        </View>

        {/* Buttons skeleton */}
        <View
          style={[styles.buttonsContainerBase, styles.defaultHorizontalPadding]}
        >
          <Skeleton height={28} width={'100%'} style={styles.skeletonRounded} />
        </View>

        {/* Management options skeleton */}
        <View style={styles.managementOptionsContainer}>
          <View style={styles.defaultHorizontalPadding}>
            <Skeleton
              height={60}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          </View>
          <View style={styles.defaultHorizontalPadding}>
            <Skeleton
              height={60}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Only show error if we're not in initial load state and have actually failed
  if (error && !isInitialLoad) {
    Logger.log('CardHome: Showing error state', { error, retries });
    return (
      <View style={styles.errorContainer}>
        <Icon
          name={IconName.Forest}
          size={IconSize.Xl}
          color={theme.colors.icon.default}
        />
        <Text
          variant={TextVariant.HeadingSM}
          color={theme.colors.text.alternative}
        >
          {strings('card.card_home.error_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={theme.colors.text.alternative}
          style={styles.errorDescription}
        >
          {strings('card.card_home.error_description')}
        </Text>
        {retries < 3 && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                Logger.log('CardHome: Retry button pressed', { retries });
                setRetries((prevState) => prevState + 1);
                fetchPriorityToken();

                if (cardDetailsError) {
                  fetchCardDetails();
                }
              }}
              testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={styles.contentContainer}
    >
      {priorityTokenWarning && (
        <CardWarningBox
          warning={priorityTokenWarning}
          onConfirm={addFundsAction}
        />
      )}

      {shouldShowSpendingLimitWarning && showSpendingLimitWarning && (
        <SpendingLimitWarning
          onDismiss={() => {
            setShowSpendingLimitWarning(false);
            setWarningDismissed(true);
          }}
        />
      )}
      <View style={styles.cardBalanceContainer}>
        <View
          style={[
            styles.balanceTextContainer,
            styles.defaultHorizontalPadding,
            priorityTokenWarning === CardWarning.NeedDelegation &&
              styles.shouldBeHidden,
          ]}
        >
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {(isLoading ||
              balanceAmount === TOKEN_BALANCE_LOADING ||
              balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE) &&
            !isInitialLoad ? (
              <Skeleton
                height={28}
                width={'50%'}
                style={styles.skeletonRounded}
                testID={CardHomeSelectors.BALANCE_SKELETON}
              />
            ) : (
              balanceAmount ?? '0'
            )}
          </SensitiveText>
          <TouchableOpacity
            onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
            testID={CardHomeSelectors.PRIVACY_TOGGLE_BUTTON}
          >
            <Icon
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={theme.colors.icon.alternative}
            />
          </TouchableOpacity>
        </View>
        {isAllowanceLimited && (
          <View
            style={[
              styles.limitedAllowanceWarningContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
              >
                {strings('card.card_home.limited_spending_warning', {
                  manageCard: '',
                })}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
                style={styles.limitedAllowanceManageCardText}
              >
                {strings('card.card_home.manage_card_options.manage_card')}
                {'.'}
              </Text>
            </Text>
          </View>
        )}
        <View
          style={[
            styles.cardImageContainer,
            styles.defaultHorizontalPadding,
            isAllowanceLimited && styles.defaultMarginTop,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={240}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          ) : (
            <CardImage
              type={cardDetails?.type ?? CardType.VIRTUAL}
              address={priorityToken?.walletAddress || null}
            />
          )}
        </View>
        <View
          style={[
            styles.cardAssetItemContainer,
            styles.defaultHorizontalPadding,
            priorityTokenWarning === CardWarning.NeedDelegation &&
              styles.shouldBeHidden,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem asset={asset} privacyMode={privacyMode} />
          )}
        </View>

        {priorityToken && priorityToken.allowance && (
          <View
            style={[
              styles.buttonsContainerBase,
              styles.defaultHorizontalPadding,
            ]}
          >
            <View style={styles.divider} />
          </View>
        )}

        {priorityToken && priorityToken.allowance && (
          <View
            style={[
              styles.buttonsContainerBase,
              styles.defaultHorizontalPadding,
            ]}
          >
            {!spendingLimitSettings.isFullAccess && (
              <SpendingLimitProgressBar
                priorityToken={priorityToken}
                spendingLimitSettings={spendingLimitSettings}
              />
            )}
          </View>
        )}

        <View
          style={[styles.buttonsContainerBase, styles.defaultHorizontalPadding]}
        >
          {ButtonsSection}
        </View>
      </View>

      <View
        style={[
          priorityTokenWarning === CardWarning.NeedDelegation &&
            styles.shouldBeHidden,
        ]}
      >
        {isBaanxLoginEnabled && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.manage_spending_limit',
            )}
            description={strings(
              priorityToken?.allowanceState === AllowanceState.Enabled
                ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
                : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={manageSpendingLimitAction}
            testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
          />
        )}

        <ManageCardListItem
          title={strings('card.card_home.manage_card_options.manage_card')}
          description={strings(
            'card.card_home.manage_card_options.advanced_card_management_description',
          )}
          rightIcon={IconName.Export}
          onPress={navigateToCardPage}
          testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
        />
      </View>

      {isAuthenticated && (
        <ManageCardListItem
          title="Logout"
          description="Logout of your Card account"
          rightIcon={IconName.Logout}
          onPress={logoutAction}
        />
      )}

      {openAddFundsBottomSheet && renderAddFundsBottomSheet()}

      {openAssetSelectionBottomSheet && (
        <AssetSelectionBottomSheet
          ref={assetSelectionBottomSheetRef}
          onClose={() => setOpenAssetSelectionBottomSheet(false)}
          priorityToken={priorityToken || undefined}
          onTokenSelect={async (token) => {
            try {
              // Convert chain ID to hex format (0xe708 for Linea Mainnet)
              const hexChainId = `0x${parseInt(token.chainId, 10).toString(
                16,
              )}`;

              // Get current wallet details to update priority
              if (!sdk) {
                throw new Error('Card SDK not available');
              }

              const currentWalletDetails =
                await sdk.getCardExternalWalletDetails();
              const selectedWallet = currentWalletDetails.find(
                (wallet) =>
                  wallet.currency.toLowerCase() === token.symbol.toLowerCase(),
              );

              if (selectedWallet) {
                // Create new priority order: selected token becomes priority 1, others shift down
                const newPriorities = currentWalletDetails.map(
                  (wallet, index) => ({
                    id: wallet.id,
                    priority: wallet.id === selectedWallet.id ? 1 : index + 2,
                  }),
                );

                Logger.log('Updating wallet priorities:', newPriorities);
                await sdk.updateWalletPriority(newPriorities);
                Logger.log(
                  'Wallet priority updated successfully:',
                  newPriorities,
                );
              } else {
                Logger.log(
                  'Selected wallet not found in current wallet details - may need more time for Baanx to process',
                );
              }

              // Update the priority token in Redux store
              dispatch(
                setAuthenticatedPriorityToken({
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  allowanceState: token.enabled
                    ? AllowanceState.Enabled
                    : AllowanceState.NotEnabled,
                  allowance: token.enabled ? BAANX_MAX_LIMIT : '0',
                  chainId: hexChainId,
                  isStaked: false,
                }),
              );

              Logger.log('Priority token updated successfully:', token.symbol);
            } catch (setPriorityTokenError) {
              Logger.log(
                'Error setting priority token:',
                setPriorityTokenError,
              );
            } finally {
              setOpenAssetSelectionBottomSheet(false);
            }
          }}
        />
      )}
    </ScrollView>
  );
};

export default CardHome;
