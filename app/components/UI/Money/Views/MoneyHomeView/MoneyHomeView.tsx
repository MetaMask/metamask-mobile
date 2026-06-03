import React, { useCallback, useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import MoneyHeader from '../../components/MoneyHeader';
import MoneyBalanceSummary from '../../components/MoneyBalanceSummary';
import MoneyActionButtonRow from '../../components/MoneyActionButtonRow';
import MoneyEarnings from '../../components/MoneyEarnings';
import MoneyMusdTokenRow from '../../components/MoneyMusdTokenRow';
import MoneyOnboardingCard from '../../components/MoneyOnboardingCard';
import MoneyCondensedInfoCards from '../../components/MoneyCondensedInfoCards';
import MoneyHowItWorks from '../../components/MoneyHowItWorks';
import MoneyPotentialEarnings from '../../components/MoneyPotentialEarnings';
import MoneyMetaMaskCard from '../../components/MoneyMetaMaskCard';
import MoneyWhatYouGet from '../../components/MoneyWhatYouGet';
import MoneyActivityList from '../../components/MoneyActivityList';
import MoneyFooter from '../../components/MoneyFooter';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { useMoneyDepositTokens } from '../../hooks/useMoneyDepositTokens';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { useMoneyAccountCardTransactions } from '../../hooks/useMoneyAccountCardTransactions';
import { mergeMoneyActivity } from '../../hooks/useMoneyActivityItems';
import MoneyActivityLoading from '../../components/MoneyActivityLoading/MoneyActivityLoading';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import { useOnboardingStep, STEPPER_IDS } from '../../hooks/useOnboardingStep';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { isAccountFunded } from '../../utils/isAccountFunded';
import { calculateProjectedEarnings } from '../../utils/projections';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from '../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import AppConstants from '../../../../../core/AppConstants';
import NavigationService from '../../../../../core/NavigationService';
import {
  selectHasMetalCard,
  selectIsCardholder,
} from '../../../../../selectors/cardController';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { useCardHomeData } from '../../../Card/hooks/useCardHomeData';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { MoneyBalanceDisplayState } from '../../types';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { MONEY_ONBOARDING_TOTAL_STEPS } from '../../components/MoneyOnboardingCard/MoneyOnboardingCard';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  REDIRECT_TARGETS,
  SCREEN_NAMES,
  SHEET_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { colors } = useTheme();

  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
  });

  const {
    totalFiatFormatted,
    totalFiatRaw,
    tokenTotal,
    vaultApyQuery,
    isAggregatedBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    refetchBalance,
    apyPercent,
  } = useMoneyAccountBalance();

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchBalance();
    } catch (error) {
      Logger.error(error as Error, '[MoneyHomeView] Pull-to-refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [refetchBalance]);

  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { fiatBalanceAggregatedFormatted: musdFiatFormatted } =
    useMusdBalance();

  const { tokens: depositTokens, isNoFeeToken } = useMoneyDepositTokens();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { allTransactions, moneyAddress, mockDataEnabled } =
    useMoneyAccountTransactions();
  const { cardTransactions, isLoading: isCardActivityLoading } =
    useMoneyAccountCardTransactions();
  // Mock mode shows curated demo data only — never merge real card spends (or
  // their loading state) into it.
  const showCardActivityLoading = isCardActivityLoading && !mockDataEnabled;
  const activityItems = useMemo(
    () =>
      mergeMoneyActivity(
        allTransactions,
        mockDataEnabled ? [] : cardTransactions,
      ),
    [allTransactions, cardTransactions, mockDataEnabled],
  );

  const isCardholder = useSelector(selectIsCardholder);
  const hasMetalCard = useSelector(selectHasMetalCard);
  const {
    startLinkFlow,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isLinking,
  } = useMoneyAccountCardLinkage();

  const { isVisible: isOnboardingCardVisible } = useOnboardingStep({
    stepperId: STEPPER_IDS.MONEY,
    totalSteps: MONEY_ONBOARDING_TOTAL_STEPS,
  });

  const balanceReady = tokenTotal !== undefined;
  const isFunded = isAccountFunded(tokenTotal) || activityItems.length > 0;

  let displayState: MoneyBalanceDisplayState;
  if (!hasMoneyAccount) {
    displayState = { kind: 'noAccount' };
  } else if (isBalanceFetchError && isBalanceFetching) {
    displayState = { kind: 'retrying' };
  } else if (isBalanceFetchError) {
    displayState = { kind: 'error', onRetry: refetchBalance };
  } else if (isAggregatedBalanceLoading) {
    displayState = { kind: 'loading' };
  } else if (totalFiatFormatted === undefined) {
    displayState = { kind: 'unavailable' };
  } else {
    displayState = { kind: 'balance', value: totalFiatFormatted };
  }

  const formattedZero = useMemo(
    () => moneyFormatFiat(new BigNumber(0), currentCurrency),
    [currentCurrency],
  );

  const monthlyEarnings = useMemo(() => {
    if (!totalFiatRaw || !apyPercent) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = calculateProjectedEarnings(
      balance.toNumber(),
      apyPercent,
      1 / 12,
    );
    if (!Number.isFinite(earnings)) return formattedZero;
    const formatted = moneyFormatFiat(new BigNumber(earnings), currentCurrency);
    return formatted === formattedZero ? formatted : `+${formatted}`;
  }, [totalFiatRaw, apyPercent, currentCurrency, formattedZero]);

  const yearlyEarnings = useMemo(() => {
    if (!totalFiatRaw || !apyPercent) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = calculateProjectedEarnings(
      balance.toNumber(),
      apyPercent,
      1,
    );
    if (!Number.isFinite(earnings)) return formattedZero;
    const formatted = moneyFormatFiat(new BigNumber(earnings), currentCurrency);
    return formatted === formattedZero ? formatted : `+${formatted}`;
  }, [totalFiatRaw, apyPercent, currentCurrency, formattedZero]);

  const handleMenuPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  }, [navigation]);

  const handleAddPress = useCallback(() => {
    trackButtonClicked({
      label_localized: strings('money.action.add'),
      label_en: strings('money.action.add', { locale: 'en' }),
      redirect_target_type: REDIRECT_TARGETS.BOTTOM_SHEET,
      redirect_target: SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
      component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
      button_position: 1,
      button_row_button_count: 3,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation, trackButtonClicked]);

  const handleTransferPress = useCallback(() => {
    trackButtonClicked({
      label_localized: strings('money.action.transfer'),
      label_en: strings('money.action.transfer', { locale: 'en' }),
      redirect_target_type: REDIRECT_TARGETS.BOTTOM_SHEET,
      redirect_target: SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
      component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
      button_position: 2,
      button_row_button_count: 3,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
    });
  }, [navigation, trackButtonClicked]);

  const handleCardPress = useCallback(() => {
    trackButtonClicked({
      label_localized: strings('money.action.card'),
      label_en: strings('money.action.card', { locale: 'en' }),
      redirect_target_type: REDIRECT_TARGETS.SCREEN,
      redirect_target: SCREEN_NAMES.CARD_HOME,
      component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
      button_position: 3,
      button_row_button_count: 3,
    });

    navigation.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
    });
  }, [navigation, trackButtonClicked]);

  const handleLinkCardPress = useCallback(() => {
    startLinkFlow(MONEY_HOME_CARD_ORIGIN);
  }, [startLinkFlow]);

  const handleApyInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent },
    });
  }, [navigation, apyPercent]);

  const handleEarningsInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
    });
  }, [navigation]);

  const handleEarnCryptoInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  }, [navigation]);

  const handleMusdRowPress = useCallback(() => {
    NavigationService.navigation.navigate('Asset', {
      ...MUSD_MAINNET_ASSET_FOR_DETAILS,
      source: TokenDetailsSource.MobileTokenListPage,
    });
  }, []);

  const handleTokenDepositPress = useCallback(
    async (token: AssetType) => {
      try {
        await initiateDeposit({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyHomeView] Failed to initiate conversion from potential earnings',
        });
      }
    },
    [initiateDeposit],
  );

  const handleEarnCryptoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.POTENTIAL_EARNINGS as never);
  }, [navigation]);

  const handleLearnMorePress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
  }, []);

  const handleHowItWorksHeaderPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.HOW_IT_WORKS as never);
  }, [navigation]);

  const handleViewAllActivityPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation]);
  const handleActivityHeaderPress = handleViewAllActivityPress;

  const handleActivityItemPress = useCallback(
    (transactionId: string) => {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.TRANSACTION_DETAILS_SHEET,
        params: { transactionId },
      });
    },
    [navigation],
  );

  let metamaskCardMode: 'upsell' | 'link' | 'manage';
  if (isCardLinkedToMoneyAccount) {
    metamaskCardMode = 'manage';
  } else if (isCardAuthenticated || isCardholder) {
    metamaskCardMode = 'link';
  } else {
    metamaskCardMode = 'upsell';
  }

  const { primaryToken: cardPrimaryToken } = useCardHomeData();
  const cardBalance = cardPrimaryToken?.balanceFiat ?? formattedZero;

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="flex-1 bg-default"
      testID={MoneyHomeViewTestIds.CONTAINER}
    >
      <MoneyHeader onMenuPress={handleMenuPress} />
      <ScrollView
        testID={MoneyHomeViewTestIds.SCROLL_VIEW}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.icon.default}
            colors={[colors.primary.default]}
          />
        }
      >
        <MoneyBalanceSummary
          apy={apyPercent}
          displayState={displayState}
          onApyInfoPress={handleApyInfoPress}
        />
        <MoneyActionButtonRow
          onAddPress={handleAddPress}
          onTransferPress={handleTransferPress}
          onCardPress={handleCardPress}
        />
        <MoneyOnboardingCard />
        {isOnboardingCardVisible && <Divider />}
        {/* Only show earnings if balance is available and non-zero */}
        {displayState.kind === 'balance' &&
          totalFiatRaw &&
          !new BigNumber(totalFiatRaw).isZero() && (
            <>
              <MoneyEarnings
                monthlyEarnings={monthlyEarnings}
                yearlyEarnings={yearlyEarnings}
                isLoading={
                  vaultApyQuery.isLoading || isAggregatedBalanceLoading
                }
                onInfoPress={handleEarningsInfoPress}
              />
              <Divider />
            </>
          )}
        {balanceReady && !isFunded && (
          <>
            <MoneyHowItWorks
              apy={apyPercent}
              onHeaderPress={handleHowItWorksHeaderPress}
              isLoading={vaultApyQuery.isLoading}
            />
            <MoneyMusdTokenRow
              onPress={handleMusdRowPress}
              onAddPress={handleAddPress}
              balance={musdFiatFormatted}
            />
            <Divider />
          </>
        )}
        {(showCardActivityLoading || activityItems.length >= 1) && (
          <>
            {showCardActivityLoading ? (
              <MoneyActivityLoading />
            ) : (
              <MoneyActivityList
                items={activityItems}
                moneyAddress={moneyAddress}
                onViewAllPress={handleViewAllActivityPress}
                onHeaderPress={handleActivityHeaderPress}
                onItemPress={
                  mockDataEnabled ? undefined : handleActivityItemPress
                }
              />
            )}
            <Divider />
          </>
        )}
        {depositTokens.length > 0 && (
          <>
            <MoneyPotentialEarnings
              tokens={depositTokens}
              apy={apyPercent}
              isNoFeeToken={isNoFeeToken}
              onTokenPress={handleTokenDepositPress}
              onViewAllPress={handleEarnCryptoPress}
              onHeaderPress={handleEarnCryptoPress}
              onInfoPress={handleEarnCryptoInfoPress}
            />
            <Divider />
          </>
        )}
        <MoneyMetaMaskCard
          mode={metamaskCardMode}
          onGetNowPress={handleCardPress}
          onHeaderPress={handleCardPress}
          onLinkPress={handleLinkCardPress}
          onManagePress={handleCardPress}
          showMetalCard={hasMetalCard}
          isLinkDisabled={isLinking}
          cardBalance={cardBalance}
          apy={apyPercent}
        />
        <Divider />
        {isFunded && (
          <>
            <MoneyCondensedInfoCards
              onHowItWorksPress={handleHowItWorksHeaderPress}
              onMusdPress={handleMusdRowPress}
              onWhatYouGetPress={handleLearnMorePress}
            />
            <Divider />
          </>
        )}
        {balanceReady && !isFunded && (
          <MoneyWhatYouGet
            apy={apyPercent}
            onLearnMorePress={handleLearnMorePress}
          />
        )}
        <MoneyFooter onAddMoneyPress={handleAddPress} />
      </ScrollView>
    </Box>
  );
};

export default MoneyHomeView;
