import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles from './CardHome.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { AllowanceState, CardTokenAllowance, CardType } from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import CardImage from '../../components/CardImage';
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
import { DEPOSIT_SUPPORTED_TOKENS } from '../../constants';
import { useCardController } from '../../hooks/useCardController';
import { CardLoadingPhase } from '../../../../../core/Engine/controllers/card-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import CardWarning from '../../components/CardWarning';

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
  const [openAddFundsBottomSheet, setOpenAddFundsBottomSheet] = useState(false);
  const [retries, setRetries] = useState(0);
  const sheetRef = useRef<BottomSheetRef>(null);

  // Use the new CardController hook
  const {
    isAuthenticated,
    priorityToken,
    loadingPhase,
    isLoading,
    hasErrors,
    error,
    fetchPriorityToken,
    logout: logoutFromProvider,
    resetRetries,
    isBaanxLoginEnabled,
    isCardholder,
    needsProvisioning,
    cardDetails,
  } = useCardController();

  // Debug: Log when component re-renders with new state
  useEffect(() => {
    Logger.log('CardHome: Component re-rendered with state', {
      isAuthenticated,
      isCardholder,
      loadingPhase,
      isBaanxLoginEnabled,
    });
  }, [isAuthenticated, isCardholder, loadingPhase, isBaanxLoginEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);

  const { balanceFiat, mainBalance, rawFiatNumber, rawTokenBalance } =
    useAssetBalance(priorityToken as CardTokenAllowance);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { openSwaps } = useOpenSwaps({
    priorityToken: priorityToken as CardTokenAllowance,
  });

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited = useMemo(
    () => priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken],
  );

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return mainBalance;
    }

    return balanceFiat;
  }, [balanceFiat, mainBalance]);

  const isPriorityTokenSupportedDeposit = useMemo(() => {
    if (priorityToken?.symbol) {
      return DEPOSIT_SUPPORTED_TOKENS.find(
        (t) => t.toLowerCase() === priorityToken.symbol?.toLowerCase(),
      );
    }
  }, [priorityToken]);

  const renderAddFundsBottomSheet = useCallback(
    () => (
      <AddFundsBottomSheet
        sheetRef={sheetRef}
        setOpenAddFundsBottomSheet={setOpenAddFundsBottomSheet}
        priorityToken={priorityToken as CardTokenAllowance}
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

  // Handle navigation based on cardholder and authentication status
  useEffect(() => {
    Logger.log('CardHome: Navigation check', {
      loadingPhase,
      isCardholder,
      isAuthenticated,
      isBaanxLoginEnabled,
    });
    if (loadingPhase === CardLoadingPhase.COMPLETE) {
      if (isAuthenticated) {
        // User is authenticated globally, stay on CardHome regardless of cardholder status
        Logger.log('CardHome: Staying on card home - user authenticated', {
          isCardholder,
          isAuthenticated,
          isBaanxLoginEnabled,
        });
      } else if (!isCardholder) {
        // User is not authenticated and current wallet is not a cardholder
        Logger.log(
          'CardHome: Redirecting to welcome screen - not authenticated and not cardholder',
        );
        navigation.navigate(Routes.CARD.WELCOME);
      } else if (isCardholder && isBaanxLoginEnabled) {
        // User is not authenticated, current wallet is a cardholder, and Baanx login is enabled
        Logger.log(
          'CardHome: Redirecting to welcome screen - not authenticated but cardholder (login available)',
        );
        navigation.navigate(Routes.CARD.WELCOME);
      } else {
        // User is not authenticated, current wallet is a cardholder, but Baanx is disabled
        Logger.log(
          'CardHome: Staying on card home - cardholder but Baanx disabled',
          {
            isCardholder,
            isAuthenticated,
            isBaanxLoginEnabled,
          },
        );
      }
    }
  }, [
    loadingPhase,
    isCardholder, // eslint-disable-line react-hooks/exhaustive-deps
    isAuthenticated,
    isBaanxLoginEnabled,
    navigation,
  ]);

  // Track event only once after priorityToken and balances are loaded
  const hasTrackedCardHomeView = useRef(false);

  useEffect(() => {
    // Early return if already tracked to prevent any possibility of duplicate tracking
    if (hasTrackedCardHomeView.current) {
      return;
    }

    // Don't track while still loading to prevent premature tracking
    if (isLoading || loadingPhase !== CardLoadingPhase.COMPLETE) {
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
      // Set flag immediately to prevent race conditions
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
    isLoading,
    loadingPhase,
  ]);

  useEffect(() => {
    Logger.log('CardHome: priorityToken changed', { priorityToken });
  }, [priorityToken]);

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
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
    isPriorityTokenSupportedDeposit,
    selectedChainId,
  ]);

  const changeAssetAction = useCallback(() => {
    if (isAuthenticated) {
      // open asset bottom sheet
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const manageSpendingLimitAction = useCallback(() => {
    if (isAuthenticated) {
      // open spending limit screen
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const logoutAction = () => {
    logoutFromProvider();
  };

  // Show comprehensive loading during initialization and authentication
  if (
    loadingPhase === CardLoadingPhase.INITIALIZING ||
    loadingPhase === CardLoadingPhase.AUTHENTICATING
  ) {
    return (
      <ScrollView
        style={styles.wrapper}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View
          style={[
            styles.defaultHorizontalPadding,
            styles.skeletonHeaderPadding,
          ]}
        >
          <Skeleton height={24} width={120} style={styles.skeletonRounded} />
          <Skeleton
            height={16}
            width={200}
            style={[styles.skeletonRounded, styles.skeletonMarginTop]}
          />
        </View>

        <View style={styles.cardImageContainer}>
          <Skeleton
            height={200}
            width={'90%'}
            style={[styles.skeletonRounded, styles.skeletonCenterAlign]}
          />
        </View>

        <View style={styles.cardBalanceContainer}>
          <Skeleton height={32} width={100} style={styles.skeletonRounded} />
          <Skeleton
            height={16}
            width={60}
            style={[styles.skeletonRounded, styles.skeletonMarginTop]}
          />
        </View>

        <View
          style={[styles.defaultHorizontalPadding, styles.defaultMarginTop]}
        >
          <Skeleton height={60} width={'100%'} style={styles.skeletonRounded} />
        </View>

        <View
          style={[styles.defaultHorizontalPadding, styles.defaultMarginTop]}
        >
          <Skeleton height={44} width={'100%'} style={styles.skeletonRounded} />
        </View>

        <View
          style={[styles.defaultHorizontalPadding, styles.defaultMarginTop]}
        >
          <Skeleton height={44} width={'100%'} style={styles.skeletonRounded} />
        </View>

        <View
          style={[styles.defaultHorizontalPadding, styles.defaultMarginTop]}
        >
          <Skeleton height={60} width={'100%'} style={styles.skeletonRounded} />
        </View>
      </ScrollView>
    );
  }

  if (hasErrors) {
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
          {error || strings('card.card_home.error_description')}
        </Text>
        {retries < 3 && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                resetRetries();
                fetchPriorityToken();
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
      {needsProvisioning && <CardWarning type="provisioning" />}
      <View style={styles.cardBalanceContainer}>
        <View
          style={[styles.balanceTextContainer, styles.defaultHorizontalPadding]}
        >
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {isLoading ||
            balanceAmount === TOKEN_BALANCE_LOADING ||
            balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
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
              height={200}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          ) : (
            <CardImage type={cardDetails?.type ?? CardType.VIRTUAL} />
          )}
        </View>
        <View
          style={[
            styles.cardAssetItemContainer,
            styles.defaultHorizontalPadding,
          ]}
        >
          {isLoading || !priorityToken ? (
            <Skeleton
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem
              assetKey={priorityToken as CardTokenAllowance}
              privacyMode={privacyMode}
            />
          )}
        </View>

        <View
          style={[styles.buttonsContainerBase, styles.defaultHorizontalPadding]}
        >
          {isLoading ? (
            <Skeleton
              height={28}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
            />
          ) : (
            <>
              {isBaanxLoginEnabled ? (
                <View style={styles.buttonsContainer}>
                  <Button
                    variant={ButtonVariants.Primary}
                    style={styles.halfWidthButton}
                    label={strings('card.card_home.add_funds')}
                    size={ButtonSize.Lg}
                    onPress={addFundsAction}
                    width={ButtonWidthTypes.Full}
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
                    loading={isLoading}
                    testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
                  />
                </View>
              ) : (
                <Button
                  variant={ButtonVariants.Primary}
                  label={strings('card.card_home.add_funds')}
                  size={ButtonSize.Lg}
                  onPress={addFundsAction}
                  width={ButtonWidthTypes.Full}
                  loading={loadingPhase === CardLoadingPhase.FETCHING_DATA}
                  testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
                />
              )}
            </>
          )}
        </View>
      </View>

      <>
        {isLoading ? (
          <View
            style={[styles.defaultHorizontalMargin, styles.defaultMarginTop]}
          >
            <Skeleton
              height={50}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          </View>
        ) : (
          <>
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

            {isBaanxLoginEnabled &&
            isAuthenticated &&
            loadingPhase === CardLoadingPhase.COMPLETE ? (
              <ManageCardListItem
                title="Logout"
                description="Logout of your Card account"
                rightIcon={IconName.Logout}
                onPress={logoutAction}
              />
            ) : null}
          </>
        )}
      </>

      {openAddFundsBottomSheet && renderAddFundsBottomSheet()}
    </ScrollView>
  );
};

export default CardHome;
