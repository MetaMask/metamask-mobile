import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

// Slide distance for the footer peek-in/out animation. Large enough to fully
// clear any realistic footer height (button + safe-area insets).
const FOOTER_HIDDEN_OFFSET = 240;
const FOOTER_ANIMATION_DURATION_MS = 300;

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

  // Stepper layout, scroll offset, and scroll view height are read on every
  // scroll event (~60fps with scrollEventThrottle={16}). Storing them as state
  // would re-render MoneyHomeView on every frame during scrolling.
  const stepperLayoutRef = useRef<{ y: number; height: number } | null>(null);
  const scrollOffsetYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  // ScrollView reserves matching bottom padding so the absolutely positioned
  // footer overlay never hides scroll content -- state, not a ref, so the
  // padding update triggers a re-render.
  const [footerHeight, setFooterHeight] = useState(0);

  const footerTranslateY = useSharedValue(
    hasSeenMusdConversionEducation ? 0 : FOOTER_HIDDEN_OFFSET,
  );
  const footerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: footerTranslateY.value }],
  }));
  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  // Default to "stepper visible" until layouts settle so the footer stays
  // hidden in the initial paint and we avoid a brief flash of "Add money".
  // Mirrored in a ref so the scroll-driven flip can compare without stale
  // state and trigger the animation outside any setState updater.
  const isStepperVisibleRef = useRef(true);

  const computeStepperVisibility = useCallback(() => {
    const stepperLayout = stepperLayoutRef.current;
    const scrollViewHeight = scrollViewHeightRef.current;
    // Treat a missing layout, an unmeasured (height === 0) stepper, or a
    // not-yet-laid-out scroll view as "stepper still considered visible" so the
    // footer stays hidden until measurements settle. This avoids a flash of
    // "Add money" before the stepper's onLayout reports a real height.
    if (
      !stepperLayout ||
      stepperLayout.height === 0 ||
      scrollViewHeight === 0
    ) {
      return true;
    }
    // The footer should only peek in once the user has scrolled past the
    // stepper's bottom edge. While the stepper is anywhere on screen — or
    // still below the fold and reachable by scrolling — the footer stays
    // hidden. This matches the AC ("scrolling past the stepper triggers the
    // peek animation").
    const stepperBottom = stepperLayout.y + stepperLayout.height;
    const isUserPastStepper = scrollOffsetYRef.current > stepperBottom;
    return !isUserPastStepper;
  }, []);

  const animateFooter = useCallback(
    (visible: boolean) => {
      footerTranslateY.value = withTiming(visible ? 0 : FOOTER_HIDDEN_OFFSET, {
        duration: FOOTER_ANIMATION_DURATION_MS,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      });
    },
    [footerTranslateY],
  );

  const updateStepperVisibility = useCallback(() => {
    const next = computeStepperVisibility();
    if (next === isStepperVisibleRef.current) return;
    isStepperVisibleRef.current = next;
    animateFooter(hasSeenMusdConversionEducation || !next);
  }, [computeStepperVisibility, animateFooter, hasSeenMusdConversionEducation]);

  // `hasSeenMusdConversionEducation` is monotonic in Redux (false -> true,
  // never back), so we only handle the false -> true transition here.
  useEffect(() => {
    if (hasSeenMusdConversionEducation) {
      footerTranslateY.value = 0;
    }
  }, [hasSeenMusdConversionEducation, footerTranslateY]);

  const handleStepperLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      const prev = stepperLayoutRef.current;
      if (prev && prev.y === y && prev.height === height) {
        return;
      }
      stepperLayoutRef.current = { y, height };
      updateStepperVisibility();
    },
    [updateStepperVisibility],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Update the ref unconditionally on every scroll frame (cheap) but only
      // commit a state change when the visibility boolean actually flips.
      scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
      updateStepperVisibility();
    },
    [updateStepperVisibility],
  );

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (scrollViewHeightRef.current === height) {
        return;
      }
      scrollViewHeightRef.current = height;
      updateStepperVisibility();
    },
    [updateStepperVisibility],
  );

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setFooterHeight((prev) => (prev === height ? prev : height));
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
        contentContainerStyle={scrollContentStyle}
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
        {!hasSeenMusdConversionEducation && (
          <Box onLayout={handleStepperLayout}>
            <MoneyOnboardingCard
              currentStep={isMilestone ? 2 : 1}
              variant={isCardholderWithMilestone ? 'link-card' : 'get-card'}
              onCtaPress={handleOnboardingCtaPress}
            />
          </Box>
        )}
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
      <Animated.View
        onLayout={handleFooterLayout}
        style={[styles.footerOverlay, footerAnimatedStyle]}
      >
        <MoneyFooter onAddMoneyPress={handleAddPress} />
      </Animated.View>
    </Box>
  );
};

export default MoneyHomeView;
