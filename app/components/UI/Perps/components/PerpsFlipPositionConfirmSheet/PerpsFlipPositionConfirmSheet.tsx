import React, { useCallback, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsFlipPositionConfirmSheetSelectorsIDs } from '../../Perps.testIds';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import type { PerpsFlipPositionConfirmSheetProps } from './PerpsFlipPositionConfirmSheet.types';
import createStyles from './PerpsFlipPositionConfirmSheet.styles';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import {
  useMinimumOrderAmount,
  usePerpsOrderFees,
  usePerpsRewards,
  usePerpsMeasurement,
} from '../../hooks';
import { usePerpsFlipPosition } from '../../hooks/usePerpsFlipPosition';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import {
  BASIS_POINTS_DIVISOR,
  getPerpsDisplaySymbol,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { PERPS_SLIPPAGE_DEFAULT_BPS } from '../../constants/slippageConfig';
import { toPerpsEntryAttribution } from '../../utils/perpsAnalyticsAttribution';
import PerpsFeesDisplay from '../PerpsFeesDisplay';
import PerpsValidationErrors from '../PerpsValidationErrors';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import { useVipTier } from '../../../Rewards/hooks/useVipTier';
import {
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';

const PerpsFlipPositionConfirmSheet: React.FC<
  PerpsFlipPositionConfirmSheetProps
> = ({
  position,
  sheetRef: externalSheetRef,
  onClose,
  onConfirm,
  enableHaptics = false,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { playImpact } = useHaptics();

  // Measure bottom sheet display
  usePerpsMeasurement({ traceName: TraceName.PerpsFlipPositionSheet });

  // Determine current and opposite direction
  const currentDirection = parseFloat(position.size) > 0 ? 'long' : 'short';
  const oppositeDirection = currentDirection === 'long' ? 'short' : 'long';
  const positionSize = Math.abs(parseFloat(position.size));

  // Get current price
  const prices = usePerpsLivePrices({
    symbols: [position.symbol],
    throttleMs: 1000,
  });
  const currentPrice = prices[position.symbol];
  const price = parseFloat(currentPrice?.price || '0');
  const markPrice = parseFloat(currentPrice?.markPrice || '0');

  // Calculate USD amount for fee estimation.
  // A flip places one order of 2x position size (1x to close current, 1x to open opposite).
  // Fee is charged on the full 2x notional, so multiply by 2 for an accurate estimate.
  const usdAmount = useMemo(
    () => (positionSize * 2 * (markPrice || price)).toString(),
    [positionSize, markPrice, price],
  );

  // Get top of book for maker/taker fee determination
  const topOfBook = usePerpsTopOfBook({ symbol: position.symbol });

  // Calculate estimated fees
  const feeResults = usePerpsOrderFees({
    orderType: 'market',
    amount: usdAmount,
    symbol: position.symbol,
    isClosing: false,
    direction: oppositeDirection,
    currentAskPrice: topOfBook?.bestAsk
      ? Number.parseFloat(topOfBook.bestAsk)
      : undefined,
    currentBidPrice: topOfBook?.bestBid
      ? Number.parseFloat(topOfBook.bestBid)
      : undefined,
  });

  const hasValidAmount = parseFloat(usdAmount) > 0;

  // The flip is a market order filled up to the default slippage away from
  // mid, so the exchange can value it below its mid-price notional.
  const { minimumOrderAmount } = useMinimumOrderAmount({
    asset: position.symbol,
  });
  const isBelowMinimum =
    hasValidAmount &&
    parseFloat(usdAmount) <
      minimumOrderAmount *
        (1 + PERPS_SLIPPAGE_DEFAULT_BPS / BASIS_POINTS_DIVISOR);
  const canFlip = hasValidAmount && !isBelowMinimum;

  // Get rewards state
  const rewardsState = usePerpsRewards({
    feeResults,
    hasValidAmount,
    isFeesLoading: feeResults.isLoadingMetamaskFee,
    orderAmount: usdAmount,
  });

  // Determine reward animation state
  let rewardAnimationState = RewardAnimationState.Idle;
  if (feeResults.isLoadingMetamaskFee) {
    rewardAnimationState = RewardAnimationState.Loading;
  } else if (rewardsState.hasError) {
    rewardAnimationState = RewardAnimationState.ErrorState;
  }

  // Define close handler first to avoid hoisting issues
  const handleCloseInternal = useCallback(() => {
    if (externalSheetRef) {
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose?.();
      });
    } else {
      onClose?.();
    }
  }, [externalSheetRef, sheetRef, onClose]);

  // Use flip position hook for handling position reversal
  const { handleFlipPosition, isFlipping } = usePerpsFlipPosition({
    onSuccess: () => {
      handleCloseInternal();
      onConfirm?.();
    },
  });

  const vipTier = useVipTier();

  const handleReverse = useCallback(async () => {
    if (isFlipping || !canFlip) {
      return;
    }
    if (enableHaptics) {
      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }
    await handleFlipPosition(position, {
      totalFee: feeResults.totalFee,
      metamaskFee: feeResults.metamaskFee,
      metamaskFeeRate: feeResults.metamaskFeeRate,
      marketPrice: markPrice || price,
      vipTier: vipTier ?? undefined,
      vipDiscount: feeResults.feeDiscountPercentage,
      ...toPerpsEntryAttribution({
        source: PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN,
      }),
      source: PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN,
      ...(feeResults.protocolFeeRate !== undefined
        ? { hlFeeRate: feeResults.protocolFeeRate }
        : {}),
    });
  }, [
    position,
    enableHaptics,
    handleFlipPosition,
    canFlip,
    isFlipping,
    playImpact,
    feeResults.totalFee,
    feeResults.metamaskFee,
    feeResults.metamaskFeeRate,
    feeResults.feeDiscountPercentage,
    feeResults.protocolFeeRate,
    markPrice,
    price,
    vipTier,
  ]);

  const footerButtons = useMemo(
    () => [
      {
        label: strings('perps.flip_position.cancel'),
        onPress: handleCloseInternal,
        variant: ButtonVariants.Secondary,
        size: ButtonSize.Lg,
        disabled: isFlipping,
        testID: PerpsFlipPositionConfirmSheetSelectorsIDs.CANCEL_BUTTON,
      },
      {
        label: isFlipping
          ? strings('perps.flip_position.flipping')
          : strings('perps.flip_position.flip'),
        onPress: handleReverse,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        isDisabled: isFlipping || !canFlip,
        danger: true,
        testID: PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
      },
    ],
    [handleCloseInternal, handleReverse, isFlipping, canFlip],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? onClose : undefined}
      testID={PerpsFlipPositionConfirmSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader onClose={handleCloseInternal}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('perps.flip_position.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.contentContainer}>
        {isFlipping ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.loadingText}
            >
              {strings('perps.flip_position.flipping')}
            </Text>
          </View>
        ) : (
          <>
            {/* Grouped Details: Direction and Est. Size */}
            <View style={styles.detailsWrapper}>
              {/* Direction Display */}
              <View
                style={[
                  styles.detailItem,
                  styles.detailItemFirst,
                  styles.infoRow,
                  styles.detailItemWrapper,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.flip_position.direction')}
                </Text>
                <View style={styles.directionContainer}>
                  <Text variant={TextVariant.BodyMd}>
                    {currentDirection === 'long'
                      ? strings('perps.order.long_label')
                      : strings('perps.order.short_label')}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                  <Text variant={TextVariant.BodyMd}>
                    {oppositeDirection === 'long'
                      ? strings('perps.order.long_label')
                      : strings('perps.order.short_label')}
                  </Text>
                </View>
              </View>

              {/* Est. Size */}
              <View
                style={[
                  styles.detailItem,
                  styles.detailItemLast,
                  styles.infoRow,
                  styles.detailItemWrapper,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.flip_position.est_size')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  testID={
                    PerpsFlipPositionConfirmSheetSelectorsIDs.EST_SIZE_VALUE
                  }
                >
                  {positionSize} {getPerpsDisplaySymbol(position.symbol)}
                </Text>
              </View>
            </View>

            {/* Fees */}
            <View style={styles.infoRow}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('perps.order.fees')}
              </Text>
              <PerpsFeesDisplay
                feeDiscountPercentage={rewardsState.feeDiscountPercentage}
                feeSource={rewardsState.feeSource}
                fee={
                  !hasValidAmount || feeResults.isLoadingMetamaskFee
                    ? undefined
                    : feeResults.totalFee
                }
                originalFee={
                  !hasValidAmount || feeResults.isLoadingMetamaskFee
                    ? undefined
                    : feeResults.undiscountedTotalFee
                }
                testID={PerpsFlipPositionConfirmSheetSelectorsIDs.FEES_VALUE}
                variant={TextVariant.BodyMd}
              />
            </View>

            {/* Est. Points */}
            {rewardsState.shouldShowRewardsRow &&
              rewardsState.estimatedPoints !== undefined &&
              rewardsState.accountOptedIn && (
                <View style={styles.infoRow}>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings('perps.estimated_points')}
                  </Text>
                  <RewardsAnimations
                    value={rewardsState.estimatedPoints ?? 0}
                    bonusBips={rewardsState.bonusBips}
                    shouldShow={rewardsState.shouldShowRewardsRow}
                    state={rewardAnimationState}
                  />
                </View>
              )}

            {isBelowMinimum && (
              <PerpsValidationErrors
                errors={[
                  strings('perps.flip_position.below_minimum', {
                    amount: minimumOrderAmount.toString(),
                  }),
                ]}
                twClassName="pt-2"
                testID={PerpsFlipPositionConfirmSheetSelectorsIDs.MINIMUM_ERROR}
              />
            )}
          </>
        )}
      </View>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsFlipPositionConfirmSheet;
