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
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';

const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

// eslint-disable-next-line no-alert
const TEMP_ALERT_HANDLER = () => alert('Under construction 🚧');

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});

  const { tokens: conversionTokens } = useMusdConversionTokens();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // eslint-disable-next-line no-alert
  const handleMenuPress = () => alert('Under construction 🚧');

  const handleAddPress = TEMP_ALERT_HANDLER;
  const handleTransferPress = TEMP_ALERT_HANDLER;
  const handleCardPress = TEMP_ALERT_HANDLER;
  const handleAddMusdPress = TEMP_ALERT_HANDLER;
  const handleGetNowPress = TEMP_ALERT_HANDLER;
  const handleHeaderPress = TEMP_ALERT_HANDLER;

  const handleTokenAddPress = (tokenName: string) => {
    TEMP_ALERT_HANDLER();
  };

  const handleSeeEarningsPress = TEMP_ALERT_HANDLER;
  const handleLearnMorePress = TEMP_ALERT_HANDLER;
  const handleAddMoneyPress = TEMP_ALERT_HANDLER;
  const handleHowItWorksHeaderPress = TEMP_ALERT_HANDLER;
  const handlePotentialEarningsHeaderPress = TEMP_ALERT_HANDLER;
  const handleWhyMetaMaskMoneyHeaderPress = TEMP_ALERT_HANDLER;

  const handleViewAllActivityPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation]);
  const handleActivityHeaderPress = handleViewAllActivityPress;

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
        <MoneyActivityList
          transactions={MOCK_MONEY_TRANSACTIONS}
          onViewAllPress={handleViewAllActivityPress}
          onHeaderPress={handleActivityHeaderPress}
          navigation={navigation as never}
        />
        <Divider />
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
