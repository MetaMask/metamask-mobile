import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import MoneyHeader from '../../components/MoneyHeader';
import MoneyBalanceSummary from '../../components/MoneyBalanceSummary';
import MoneyActionButtonRow from '../../components/MoneyActionButtonRow';
import MoneyYourPosition from '../../components/MoneyYourPosition';
import MoneyHowItWorks from '../../components/MoneyHowItWorks';
import MoneyPotentialEarnings from '../../components/MoneyPotentialEarnings';
import MoneyMetaMaskCard from '../../components/MoneyMetaMaskCard';
import MoneyWhyMetaMaskMoney from '../../components/MoneyWhyMetaMaskMoney';
import MoneyActivityList from '../../components/MoneyActivityList';
import MoneyFooter from '../../components/MoneyFooter';
import Routes from '../../../../../constants/navigation/Routes';
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

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuPress = noopHandler;

  const handleAddPress = noopHandler;
  const handleTransferPress = noopHandler;
  const handleCardPress = noopHandler;
  const handleAddMusdPress = noopHandler;
  const handleGetNowPress = noopHandler;
  const handleHeaderPress = noopHandler;

  const handleTokenAddPress = noopHandler;

  const handleSeeEarningsPress = noopHandler;
  const handleLearnMorePress = noopHandler;
  const handleAddMoneyPress = noopHandler;
  const handleHowItWorksHeaderPress = noopHandler;
  const handlePotentialEarningsHeaderPress = noopHandler;
  const handleWhyMetaMaskMoneyHeaderPress = noopHandler;

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
        <MoneyBalanceSummary apy={String(MUSD_CONVERSION_APY)} />
        <MoneyActionButtonRow
          onAddPress={handleAddPress}
          onTransferPress={handleTransferPress}
          onCardPress={handleCardPress}
        />
        <MoneyYourPosition />
        <Divider />
        <MoneyHowItWorks
          onAddMusdPress={handleAddMusdPress}
          onHeaderPress={handleHowItWorksHeaderPress}
        />
        <Divider />
        {conversionTokens.length > 0 && (
          <>
            <MoneyPotentialEarnings
              tokens={conversionTokens}
              onTokenAddPress={handleTokenAddPress}
              onSeeEarningsPress={handleSeeEarningsPress}
              onHeaderPress={handlePotentialEarningsHeaderPress}
            />
            <Divider />
          </>
        )}
        <MoneyMetaMaskCard
          onGetNowPress={handleGetNowPress}
          onHeaderPress={handleHeaderPress}
        />
        <Divider />
        {allTransactions.length > 0 && (
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
        <MoneyWhyMetaMaskMoney
          onLearnMorePress={handleLearnMorePress}
          onHeaderPress={handleWhyMetaMaskMoneyHeaderPress}
        />
      </ScrollView>
      <MoneyFooter onAddMoneyPress={handleAddMoneyPress} />
    </Box>
  );
};

export default MoneyHomeView;
