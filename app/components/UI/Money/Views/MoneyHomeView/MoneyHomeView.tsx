import React, { useCallback, useEffect, useRef } from 'react';
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
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { showMoneyActivityUnderConstructionAlert } from '../../constants/showMoneyActivityUnderConstructionAlert';

const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

/** Placeholder until Money home actions are implemented */
const noopHandler = () => undefined;

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});

  const { tokens: conversionTokens } = useMusdConversionTokens();
  const { allTransactions, moneyAddress } = useMoneyAccountTransactions();
  const { hasMusdBalanceOnAnyChain, tokenBalanceByChain } = useMusdBalance();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedScreenViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedScreenViewRef.current) return;
    hasTrackedScreenViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.POSITION_SCREEN_VIEWED)
        .addProperties({
          item_count: Object.keys(tokenBalanceByChain).length,
          location: 'homepage',
          is_empty: Object.keys(tokenBalanceByChain).length === 0,
          screen_type: 'cash',
        })
        .build(),
    );
  }, [
    hasMusdBalanceOnAnyChain,
    tokenBalanceByChain,
    trackEvent,
    createEventBuilder,
  ]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuPress = noopHandler;

  const handleAddPress = noopHandler;
  const handleTransferPress = noopHandler;
  const handleCardPress = noopHandler;
  const handleApyInfoPress = noopHandler;
  const handleProjectedEarningsPress = noopHandler;
  const handleGetNowPress = noopHandler;
  const handleMusdRowPress = noopHandler;
  const handleHeaderPress = noopHandler;

  const handleTokenConvertPress = noopHandler;

  const handleEarnCryptoPress = noopHandler;
  const handleLearnMorePress = noopHandler;
  const handleAddMoneyPress = noopHandler;
  const handleHowItWorksHeaderPress = noopHandler;

  const handleViewAllActivityPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation]);
  const handleActivityHeaderPress = handleViewAllActivityPress;

  const handleActivityItemPress = useCallback(() => {
    showMoneyActivityUnderConstructionAlert();
  }, []);

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
          apy={String(MUSD_CONVERSION_APY)}
          onApyInfoPress={handleApyInfoPress}
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
          apy={MUSD_CONVERSION_APY}
          onHeaderPress={handleHowItWorksHeaderPress}
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
              apy={MUSD_CONVERSION_APY}
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
          apy={MUSD_CONVERSION_APY}
          onLearnMorePress={handleLearnMorePress}
        />
      </ScrollView>
      <MoneyFooter onAddMoneyPress={handleAddMoneyPress} />
    </Box>
  );
};

export default MoneyHomeView;
