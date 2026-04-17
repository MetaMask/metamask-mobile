import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import MoneyHeader from '../../components/MoneyHeader';
import MoneyBalanceSummary from '../../components/MoneyBalanceSummary';
import MoneyActionButtonRow from '../../components/MoneyActionButtonRow';
import MoneyEarnings from '../../components/MoneyEarnings';
import MoneyMusdTokenRow from '../../components/MoneyMusdTokenRow';
import MoneyOnboardingCard from '../../components/MoneyOnboardingCard';
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
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { showMoneyActivityUnderConstructionAlert } from '../../constants/showMoneyActivityUnderConstructionAlert';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';

const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

/** Placeholder until Money home actions are implemented */
// eslint-disable-next-line no-alert
const displayUnderConstructionAlert = () => alert('Under construction 🚧');

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});

  const { totalFiatFormatted, vaultApyQuery, isAggregatedBalanceLoading } =
    useMoneyAccountBalance();

  const { tokens: conversionTokens } = useMusdConversionTokens();
  const { allTransactions, moneyAddress } = useMoneyAccountTransactions();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuPress = displayUnderConstructionAlert;

  const handleAddPress = displayUnderConstructionAlert;
  const handleTransferPress = displayUnderConstructionAlert;
  const handleCardPress = displayUnderConstructionAlert;
  const handleApyInfoPress = displayUnderConstructionAlert;
  const handleProjectedEarningsPress = displayUnderConstructionAlert;
  const handleGetNowPress = displayUnderConstructionAlert;
  const handleMusdRowPress = displayUnderConstructionAlert;
  const handleHeaderPress = displayUnderConstructionAlert;

  const handleTokenConvertPress = displayUnderConstructionAlert;

  const handleEarnCryptoPress = displayUnderConstructionAlert;
  const handleLearnMorePress = displayUnderConstructionAlert;
  const handleAddMoneyPress = displayUnderConstructionAlert;
  const handleHowItWorksHeaderPress = displayUnderConstructionAlert;

  const handleViewAllActivityPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation]);
  const handleActivityHeaderPress = handleViewAllActivityPress;

  const handleActivityItemPress = useCallback(() => {
    showMoneyActivityUnderConstructionAlert();
  }, []);

  // TODO: Remove before launch
  // Useful for testing how zero and non-zero APYs are handled quickly.
  const DEV_APY = __DEV__ ? 4 : vaultApyQuery.data?.apy;

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
        <MoneyOnboardingCard onAddPress={handleAddPress} />
        <Divider />
        <MoneyEarnings onProjectedPress={handleProjectedEarningsPress} />
        <Divider />
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
        {hasConvertibleTokensWithBalance(conversionTokens) && (
          <>
            <MoneyPotentialEarnings
              tokens={conversionTokens}
              apy={DEV_APY}
              onTokenPress={handleTokenConvertPress}
              onViewAllPress={handleEarnCryptoPress}
              onHeaderPress={handleEarnCryptoPress}
            />
            <Divider />
          </>
        )}
        <MoneyMetaMaskCard
          onGetNowPress={handleGetNowPress}
          onHeaderPress={handleHeaderPress}
        />
        <Divider />
        {allTransactions.length >= 10 && (
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
        <MoneyWhatYouGet
          apy={DEV_APY}
          onLearnMorePress={handleLearnMorePress}
        />
      </ScrollView>
      <MoneyFooter onAddMoneyPress={handleAddMoneyPress} />
    </Box>
  );
};

export default MoneyHomeView;
