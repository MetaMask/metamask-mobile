import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
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
import { calculateProjectedEarnings } from '../../utils/projections';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from '../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import AppConstants from '../../../../../core/AppConstants';
import NavigationService from '../../../../../core/NavigationService';
import { selectIsCardholder } from '../../../../../selectors/cardController';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';
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
  const hasSeenMusdConversionEducation = useSelector(
    selectMusdConversionEducationSeen,
  );

  const homeState = getMoneyHomeState(allTransactions.length);
  const isMilestone = homeState === 'milestone' || homeState === 'filled';
  const isCardholderWithMilestone = isMilestone && isCardholder;

  const formattedZero = useMemo(
    () => moneyFormatFiat(new BigNumber(0), currentCurrency),
    [currentCurrency],
  );

  const projectedEarnings = useMemo(() => {
    if (!totalFiatRaw || !apyPercent) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = calculateProjectedEarnings(balance.toNumber(), apyPercent);
    if (!Number.isFinite(earnings)) return formattedZero;
    return moneyFormatFiat(new BigNumber(earnings), currentCurrency);
  }, [totalFiatRaw, apyPercent, currentCurrency, formattedZero]);

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
      params: { apy: apyPercent },
    });
  }, [navigation, apyPercent]);

  const handleEarningsInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
      params: { apy: apyPercent },
    });
  }, [navigation, apyPercent]);

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

  const [stepperLayout, setStepperLayout] = useState<{
    y: number;
    height: number;
  } | null>(null);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  // The footer height is captured imperatively from onLayout because it is
  // consumed only inside the visibility-driven animation. Storing it in a ref
  // (instead of state) keeps the slide-in/out effect tied to visibility
  // transitions, so a layout reflow that changes the height never restarts the
  // animation mid-flight.
  const footerHeightRef = useRef(0);
  const [isFooterMounted, setIsFooterMounted] = useState(
    hasSeenMusdConversionEducation,
  );

  const footerTranslateY = useRef(new Animated.Value(0)).current;

  const isStepperVisible = useMemo(() => {
    if (!stepperLayout || scrollViewHeight === 0) {
      // Default to visible until layouts settle so the footer stays hidden in
      // the initial paint and avoids a brief flash of "Add money".
      return true;
    }
    const stepperTop = stepperLayout.y;
    const stepperBottom = stepperLayout.y + stepperLayout.height;
    const viewportTop = scrollOffsetY;
    const viewportBottom = scrollOffsetY + scrollViewHeight;
    return stepperBottom > viewportTop && stepperTop < viewportBottom;
  }, [stepperLayout, scrollOffsetY, scrollViewHeight]);

  const shouldShowFooter = hasSeenMusdConversionEducation || !isStepperVisible;

  useEffect(() => {
    if (hasSeenMusdConversionEducation) {
      // Once education is seen the footer is always visible, no animation.
      setIsFooterMounted(true);
      footerTranslateY.setValue(0);
      return;
    }

    if (shouldShowFooter) {
      // Start the footer off-screen so it slides up smoothly when peeking in.
      // Read the latest measured height from a ref so subsequent layout
      // reflows do not retrigger this effect and restart the slide-in.
      footerTranslateY.setValue(footerHeightRef.current || 80);
      setIsFooterMounted(true);
      Animated.timing(footerTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (footerHeightRef.current === 0) {
      // Nothing to animate yet; ensure the footer is unmounted so the user
      // doesn't see a flash before measurements are available.
      setIsFooterMounted(false);
      return;
    }

    Animated.timing(footerTranslateY, {
      toValue: footerHeightRef.current,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsFooterMounted(false);
      }
    });
  }, [shouldShowFooter, hasSeenMusdConversionEducation, footerTranslateY]);

  const handleStepperLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setStepperLayout((prev) => {
      if (prev && prev.y === y && prev.height === height) {
        return prev;
      }
      return { y, height };
    });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollOffsetY(event.nativeEvent.contentOffset.y);
    },
    [],
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    // Cache imperatively so layout reflows update the height available to the
    // exit animation without re-running the visibility effect (which would
    // restart the slide-in animation mid-flight).
    footerHeightRef.current = height;
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
        onScroll={handleScroll}
        onLayout={handleScrollViewLayout}
        scrollEventThrottle={16}
      >
        <MoneyBalanceSummary
          apy={apyPercent}
          balance={totalFiatFormatted ?? '--.--'}
          onApyInfoPress={handleApyInfoPress}
          isLoading={vaultApyQuery.isLoading || isAggregatedBalanceLoading}
        />
        <MoneyActionButtonRow
          onAddPress={handleAddPress}
          onTransferPress={handleTransferPress}
          onCardPress={handleCardPress}
        />
        <Box onLayout={handleStepperLayout}>
          <MoneyOnboardingCard
            currentStep={isMilestone ? 2 : 1}
            variant={isCardholderWithMilestone ? 'link-card' : 'get-card'}
            onCtaPress={handleOnboardingCtaPress}
          />
        </Box>
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
              apy={apyPercent}
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
              apy={apyPercent}
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
          apy={apyPercent}
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
            apy={apyPercent}
            onLearnMorePress={handleLearnMorePress}
          />
        )}
      </ScrollView>
      {isFooterMounted &&
        (hasSeenMusdConversionEducation ? (
          <MoneyFooter onAddMoneyPress={handleAddPress} />
        ) : (
          <Animated.View
            onLayout={handleFooterLayout}
            style={{ transform: [{ translateY: footerTranslateY }] }}
          >
            <MoneyFooter onAddMoneyPress={handleAddPress} />
          </Animated.View>
        ))}
    </Box>
  );
};

export default MoneyHomeView;
