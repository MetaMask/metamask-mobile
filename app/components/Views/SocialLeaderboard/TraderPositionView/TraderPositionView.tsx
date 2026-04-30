import React, { useCallback, useContext, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import {
  Box,
  ButtonHero,
  ButtonHeroSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import { useTheme } from '../../../../util/theme';
import QuickBuyBottomSheet from './components/QuickBuyBottomSheet';
import TraderPositionHeader from './components/TraderPositionHeader';
import TraderTokenInfoRow from './components/TraderTokenInfoRow';
import TraderPositionChartSection from './components/TraderPositionChartSection';
import TraderTimePeriodSelector from './components/TraderTimePeriodSelector';
import TraderPositionPnLCard from './components/TraderPositionPnLCard';
import TraderTradesSection from './components/TraderTradesSection';
import TraderPositionSkeleton from './components/TraderPositionSkeleton';
import TraderPositionFallback from './components/TraderPositionFallback';
import { useTraderPositionData } from './useTraderPositionData';
import { useTraderPosition } from './hooks/useTraderPosition';
import { useTraderProfile } from '../TraderProfileView/hooks/useTraderProfile';

const TraderPositionView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);

  const {
    traderId,
    traderName: traderNameParam,
    traderImageUrl: traderImageUrlParam,
    tokenSymbol,
    position: positionParam,
    positionId,
  } = route.params;

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  // Position resolution: prefer the row-tap snapshot; fetch via UUID only when
  // it isn't there (deep link / out-of-app entry).
  const { position: fetchedPosition, isLoading: isPositionLoading } =
    useTraderPosition(positionParam ? undefined : positionId);
  const resolvedPosition = positionParam ?? fetchedPosition;

  // Trader profile: fetch only if name/image weren't passed in nav params.
  const needsProfile = !traderNameParam || !traderImageUrlParam;
  const { profile: fetchedProfile, isLoading: isProfileLoading } =
    useTraderProfile(needsProfile ? traderId : '');
  const traderName = traderNameParam ?? fetchedProfile?.profile?.name ?? '';
  const traderImageUrl =
    traderImageUrlParam ?? fetchedProfile?.profile?.imageUrl ?? undefined;

  const positionData = useTraderPositionData(resolvedPosition, tokenSymbol);
  const {
    symbol,
    marketCap,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    trades,
    activeTimePeriod,
    setActiveTimePeriod,
    timePeriods,
  } = positionData;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyTokenAddress = useCallback(async () => {
    if (!resolvedPosition?.tokenAddress) {
      return;
    }

    await ClipboardManager.setString(resolvedPosition.tokenAddress);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ComponentLibraryIconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('detected_tokens.address_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
  }, [
    colors.accent03.dark,
    colors.accent03.normal,
    resolvedPosition?.tokenAddress,
    toastRef,
  ]);

  const handleBuyPress = useCallback(() => {
    if (!resolvedPosition) {
      return;
    }
    // Primary CTA opening the buy flow — distinct from tab-bar `TabChange`.
    // Success/error notification haptics fire later in useQuickBuyBottomSheet.
    playImpact(ImpactMoment.PrimaryCTA);
    setIsQuickBuyVisible(true);
  }, [resolvedPosition]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleChartIndexChange = useCallback((_index: number) => {
    // Future: update displayed price on scrub
  }, []);

  const isInitialLoading =
    !resolvedPosition && (isPositionLoading || isProfileLoading);
  const hasFailed =
    !resolvedPosition && !isPositionLoading && !isProfileLoading;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      <TraderPositionHeader
        traderName={traderName}
        onBack={handleBack}
        backButtonTestID={TraderPositionViewSelectorsIDs.BACK_BUTTON}
      />

      {isInitialLoading ? (
        <TraderPositionSkeleton />
      ) : hasFailed ? (
        <TraderPositionFallback traderId={traderId} traderName={traderName} />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('pb-6')}
          >
            <TraderTokenInfoRow
              symbol={symbol}
              position={resolvedPosition}
              marketCap={marketCap}
              pricePercentChange={pricePercentChange}
              activeTimePeriodLabel={activeTimePeriod}
              onCopyTokenAddress={handleCopyTokenAddress}
              copyTokenAddressTestID={
                TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON
              }
            />

            <TraderPositionChartSection
              historicalPrices={historicalPrices}
              priceDiff={priceDiff}
              isPricesLoading={isPricesLoading}
              onChartIndexChange={handleChartIndexChange}
              trades={trades}
            />

            <TraderTimePeriodSelector
              timePeriods={timePeriods}
              activeTimePeriod={activeTimePeriod}
              onSelectPeriod={setActiveTimePeriod}
            />

            <TraderPositionPnLCard
              isClosed={isClosed}
              positionValue={positionValue}
              pnlValue={pnlValue}
              pnlPercent={pnlPercent}
              isPnlPositive={isPnlPositive}
            />

            <TraderTradesSection
              trades={trades}
              traderName={traderName}
              traderImageUrl={traderImageUrl}
            />
          </ScrollView>

          <Box twClassName="px-4 py-3">
            <ButtonHero
              size={ButtonHeroSize.Lg}
              isFullWidth
              onPress={handleBuyPress}
              testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
            >
              {strings('social_leaderboard.trader_position.buy')}
            </ButtonHero>
          </Box>

          <QuickBuyBottomSheet
            isVisible={isQuickBuyVisible}
            position={resolvedPosition ?? null}
            marketCap={marketCap}
            onClose={handleQuickBuyClose}
          />
        </>
      )}
    </SafeAreaView>
  );
};

export default TraderPositionView;
