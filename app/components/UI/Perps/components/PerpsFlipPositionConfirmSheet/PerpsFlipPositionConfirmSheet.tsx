import React, { useCallback, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import type { PerpsFlipPositionConfirmSheetProps } from './PerpsFlipPositionConfirmSheet.types';
import createStyles from './PerpsFlipPositionConfirmSheet.styles';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import {
  usePerpsOrderFees,
  usePerpsRewards,
  usePerpsMeasurement,
} from '../../hooks';
import { usePerpsFlipPosition } from '../../hooks/usePerpsFlipPosition';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import PerpsFeesDisplay from '../PerpsFeesDisplay';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';

const PerpsFlipPositionConfirmSheet: React.FC<
  PerpsFlipPositionConfirmSheetProps
> = ({ position, sheetRef: externalSheetRef, onClose, onConfirm }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  // Measure bottom sheet display
  usePerpsMeasurement({ traceName: TraceName.PerpsFlipPositionSheet });

  // Determine current and opposite direction
  const currentDirection = parseFloat(position.size) > 0 ? 'long' : 'short';
  const oppositeDirection = currentDirection === 'long' ? 'short' : 'long';
  const positionSize = Math.abs(parseFloat(position.size));

  // Get current price
  const prices = usePerpsLivePrices({
    symbols: [position.coin],
    throttleMs: 1000,
  });
  const currentPrice = prices[position.coin];
  const price = parseFloat(currentPrice?.price || '0');
  const markPrice = parseFloat(currentPrice?.markPrice || '0');

  // Calculate USD amount for fee estimation
  const usdAmount = useMemo(
    () => (positionSize * (markPrice || price)).toString(),
    [positionSize, markPrice, price],
  );

  // Get top of book for maker/taker fee determination
  const topOfBook = usePerpsTopOfBook({ symbol: position.coin });

  // Calculate estimated fees
  const feeResults = usePerpsOrderFees({
    orderType: 'market',
    amount: usdAmount,
    coin: position.coin,
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

  const handleReverse = useCallback(async () => {
    await handleFlipPosition(position);
  }, [position, handleFlipPosition]);

  const footerButtons = useMemo(
    () => [
      {
        label: strings('perps.flip_position.cancel'),
        onPress: handleCloseInternal,
        variant: ButtonVariants.Secondary,
        size: ButtonSize.Lg,
        disabled: isFlipping,
      },
      {
        label: isFlipping
          ? strings('perps.flip_position.flipping')
          : strings('perps.flip_position.flip'),
        onPress: handleReverse,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        disabled: isFlipping || !hasValidAmount,
        danger: true,
      },
    ],
    [handleCloseInternal, handleReverse, isFlipping, hasValidAmount],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader onClose={handleCloseInternal}>
        <Text variant={TextVariant.HeadingMD}>
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
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
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
              <View style={[styles.detailItem, styles.detailItemFirst]}>
                <View style={[styles.infoRow, styles.detailItemWrapper]}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.flip_position.direction')}
                  </Text>
                  <View style={styles.directionContainer}>
                    <Text variant={TextVariant.BodyMD}>
                      {currentDirection === 'long'
                        ? strings('perps.order.long_label')
                        : strings('perps.order.short_label')}
                    </Text>
                    <Icon
                      name={IconName.Arrow2Right}
                      size={IconSize.Md}
                      color={IconColor.Default}
                    />
                    <Text variant={TextVariant.BodyMD}>
                      {oppositeDirection === 'long'
                        ? strings('perps.order.long_label')
                        : strings('perps.order.short_label')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Est. Size */}
              <View style={[styles.detailItem, styles.detailItemLast]}>
                <View style={[styles.infoRow, styles.detailItemWrapper]}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.flip_position.est_size')}
                  </Text>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {positionSize} {getPerpsDisplaySymbol(position.coin)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Fees */}
            <View style={styles.infoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.fees')}
              </Text>
              <PerpsFeesDisplay
                feeDiscountPercentage={rewardsState.feeDiscountPercentage}
                formatFeeText={
                  !hasValidAmount || feeResults.isLoadingMetamaskFee
                    ? '--'
                    : formatPerpsFiat(feeResults.totalFee, {
                        ranges: PRICE_RANGES_MINIMAL_VIEW,
                      })
                }
                variant={TextVariant.BodyMD}
              />
            </View>

            {/* Est. Points */}
            {rewardsState.shouldShowRewardsRow &&
              rewardsState.estimatedPoints !== undefined &&
              rewardsState.accountOptedIn && (
                <View style={styles.infoRow}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
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
