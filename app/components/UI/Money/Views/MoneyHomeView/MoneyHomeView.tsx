import React, { useCallback, useMemo } from 'react';
import { ScrollView, Linking } from 'react-native';
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
import { hasConvertibleTokensWithBalance } from '../../components/MoneyPotentialEarnings/MoneyPotentialEarnings';
import MoneyMetaMaskCard from '../../components/MoneyMetaMaskCard';
import MoneyWhatYouGet from '../../components/MoneyWhatYouGet';
import MoneyActivityList from '../../components/MoneyActivityList';
import MoneyFooter from '../../components/MoneyFooter';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { showMoneyActivityUnderConstructionAlert } from '../../constants/showMoneyActivityUnderConstructionAlert';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from '../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import AppConstants from '../../../../../core/AppConstants';
import NavigationService from '../../../../../core/NavigationService';
import { selectIsCardholder } from '../../../../../selectors/cardController';
import Logger from '../../../../../util/Logger';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { Hex } from '@metamask/utils';

const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

type MoneyHomeState = 'empty' | 'milestone' | 'filled';

const getMoneyHomeState = (transactionCount: number): MoneyHomeState => {
  if (transactionCount === 0) return 'empty';
  if (transactionCount < 10) return 'milestone';
  return 'filled';
};

/** Placeholder until Money home actions are implemented */
// eslint-disable-next-line no-alert
const displayUnderConstructionAlert = () => alert('Under construction 🚧');

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const currentCurrency = useSelector(selectCurrentCurrency);

  const {
    totalFiatFormatted,
    totalFiatRaw,
    vaultApyQuery,
    isAggregatedBalanceLoading,
    apyPercent,
  } = useMoneyAccountBalance();

  const { tokens: conversionTokens } = useMusdConversionTokens();
  const { initiateCustomConversion } = useMusdConversion();
  const { allTransactions, moneyAddress } = useMoneyAccountTransactions();

  const isCardholder = useSelector(selectIsCardholder);

  const homeState = getMoneyHomeState(allTransactions.length);
  const isMilestone = homeState === 'milestone' || homeState === 'filled';
  const isCardholderWithMilestone = isMilestone && isCardholder;

  // TODO: Remove before launch
  // Useful for testing how zero and non-zero APYs are handled quickly.
  const DEV_APY = __DEV__ ? 4 : apyPercent;

  const formattedZero = useMemo(
    () => moneyFormatFiat(new BigNumber(0), currentCurrency),
    [currentCurrency],
  );

  const projectedEarnings = useMemo(() => {
    if (!totalFiatRaw || !DEV_APY) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = balance.times(DEV_APY).dividedBy(100);
    return moneyFormatFiat(earnings, currentCurrency);
  }, [totalFiatRaw, DEV_APY, currentCurrency, formattedZero]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  }, [navigation]);

  const handleAddPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  const handleTransferPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
    });
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const handleLinkCardPress = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
    });
  }, [navigation]);

  const handleGetNowPress = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const handleApyInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: DEV_APY },
    });
  }, [navigation, DEV_APY]);

  const handleEarningsInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
      params: { apy: DEV_APY },
    });
  }, [navigation, DEV_APY]);

  const handleMusdRowPress = useCallback(() => {
    NavigationService.navigation.navigate('Asset', {
      ...MUSD_MAINNET_ASSET_FOR_DETAILS,
      source: TokenDetailsSource.MobileTokenListPage,
    });
  }, []);

  const handleHeaderPress = displayUnderConstructionAlert;

  const handleTokenConvertPress = useCallback(
    async (token: AssetType) => {
      try {
        await initiateCustomConversion({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
          navigationStack: Routes.MONEY.ROOT,
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyHomeView] Failed to initiate conversion from potential earnings',
        });
      }
    },
    [initiateCustomConversion],
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

  const handleActivityItemPress = useCallback(() => {
    showMoneyActivityUnderConstructionAlert();
  }, []);

  const handleOnboardingCtaPress = useCallback(() => {
    if (isCardholderWithMilestone) {
      handleLinkCardPress();
      return;
    }

    if (isMilestone) {
      handleCardPress();
      return;
    }

    handleAddPress();
  }, [
    isCardholderWithMilestone,
    isMilestone,
    handleLinkCardPress,
    handleCardPress,
    handleAddPress,
  ]);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="flex-1 bg-default"
      testID={MoneyHomeViewTestIds.CONTAINER}
    >
      <MoneyHeader
        onBackPress={handleBackPress}
        onMenuPress={handleMenuPress}
      />
      <ScrollView
        testID={MoneyHomeViewTestIds.SCROLL_VIEW}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MoneyBalanceSummary
          apy={DEV_APY}
          balance={totalFiatFormatted ?? '--.--'}
          onApyInfoPress={handleApyInfoPress}
          isLoading={vaultApyQuery.isLoading || isAggregatedBalanceLoading}
        />
        <MoneyActionButtonRow
          onAddPress={handleAddPress}
          onTransferPress={handleTransferPress}
          onCardPress={handleCardPress}
        />
        <MoneyOnboardingCard
          currentStep={isMilestone ? 2 : 1}
          variant={isCardholderWithMilestone ? 'link-card' : 'get-card'}
          onCtaPress={handleOnboardingCtaPress}
        />
        <Divider />
        <MoneyEarnings
          lifetimeEarnings={formattedZero}
          projectedEarnings={projectedEarnings}
          isLoading={vaultApyQuery.isLoading || isAggregatedBalanceLoading}
          onInfoPress={handleEarningsInfoPress}
        />
        <Divider />
        {!isMilestone && (
          <>
            <MoneyHowItWorks
              apy={DEV_APY}
              onHeaderPress={handleHowItWorksHeaderPress}
              isLoading={vaultApyQuery.isLoading}
            />
            <MoneyMusdTokenRow
              onPress={handleMusdRowPress}
              onAddPress={handleAddPress}
            />
            <Divider />
          </>
        )}
        {allTransactions.length >= 1 && (
          <>
            <MoneyActivityList
              transactions={allTransactions}
              moneyAddress={moneyAddress}
              onViewAllPress={handleViewAllActivityPress}
              onHeaderPress={handleActivityHeaderPress}
              onItemPress={handleActivityItemPress}
            />
            <Divider />
          </>
        )}
        {hasConvertibleTokensWithBalance(conversionTokens) && (
          <>
            <MoneyPotentialEarnings
              tokens={conversionTokens}
              apy={DEV_APY}
              condensed={isMilestone}
              onTokenPress={handleTokenConvertPress}
              onViewAllPress={handleEarnCryptoPress}
              onHeaderPress={handleEarnCryptoPress}
            />
            <Divider />
          </>
        )}
        <MoneyMetaMaskCard
          mode={isCardholderWithMilestone ? 'link' : 'upsell'}
          onGetNowPress={handleGetNowPress}
          onHeaderPress={handleHeaderPress}
          onLinkPress={handleLinkCardPress}
          apy={DEV_APY}
        />
        <Divider />
        {isMilestone && (
          <>
            <MoneyCondensedInfoCards
              onHowItWorksPress={handleHowItWorksHeaderPress}
              onMusdPress={handleMusdRowPress}
              onWhatYouGetPress={handleLearnMorePress}
            />
            <Divider />
          </>
        )}
        {!isMilestone && (
          <MoneyWhatYouGet
            apy={DEV_APY}
            onLearnMorePress={handleLearnMorePress}
          />
        )}
      </ScrollView>
      <MoneyFooter onAddMoneyPress={handleAddPress} />
    </Box>
  );
};

export default MoneyHomeView;
