import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import { formatPrice } from '../../utils/formatUtils';
import { createStyles } from './PerpsLimitPriceBottomSheet.styles';
import { usePerpsPrices } from '../../hooks/usePerpsPrices';
import { ORDER_BOOK_SPREAD } from '../../constants/hyperLiquidConfig';

interface PerpsLimitPriceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (limitPrice: string) => void;
  asset: string;
  limitPrice?: string;
  currentPrice?: number;
}

const PerpsLimitPriceBottomSheet: React.FC<PerpsLimitPriceBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  limitPrice: initialLimitPrice,
  currentPrice: passedCurrentPrice = 0,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Initialize with initial limit price or empty to show placeholder
  const [limitPrice, setLimitPrice] = useState(initialLimitPrice || '');

  // Get real-time price data but memoize to prevent re-renders
  const priceData = usePerpsPrices([asset], {
    includeOrderBook: true, // Include order book for limit orders
  });
  const currentPriceData = priceData[asset];

  // Store price data in state to control when it updates
  const [priceSnapshot, setPriceSnapshot] = useState(() => ({
    currentPrice: passedCurrentPrice,
    markPrice: passedCurrentPrice,
    bestBid: passedCurrentPrice
      ? passedCurrentPrice * ORDER_BOOK_SPREAD.DEFAULT_BID_MULTIPLIER
      : undefined,
    bestAsk: passedCurrentPrice
      ? passedCurrentPrice * ORDER_BOOK_SPREAD.DEFAULT_ASK_MULTIPLIER
      : undefined,
  }));

  // Update price snapshot only when bottom sheet opens
  useEffect(() => {
    if (isVisible) {
      const current = currentPriceData?.price
        ? parseFloat(currentPriceData.price)
        : passedCurrentPrice;
      const mark = currentPriceData?.markPrice
        ? parseFloat(currentPriceData.markPrice)
        : current;
      const bid = currentPriceData?.bestBid
        ? parseFloat(currentPriceData.bestBid)
        : current
        ? current * ORDER_BOOK_SPREAD.DEFAULT_BID_MULTIPLIER
        : undefined;
      const ask = currentPriceData?.bestAsk
        ? parseFloat(currentPriceData.bestAsk)
        : current
        ? current * ORDER_BOOK_SPREAD.DEFAULT_ASK_MULTIPLIER
        : undefined;

      setPriceSnapshot({
        currentPrice: current,
        markPrice: mark,
        bestBid: bid,
        bestAsk: ask,
      });
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const { currentPrice, markPrice, bestBid, bestAsk } = priceSnapshot;

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    onConfirm(limitPrice);
    onClose();
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setLimitPrice(value || '');
    },
    [],
  );

  const calculatePriceForPercentage = useCallback(
    (percentage: number) => {
      // Use the current limit price if set, otherwise use market price
      const basePrice =
        limitPrice && parseFloat(limitPrice) > 0
          ? parseFloat(limitPrice)
          : currentPrice;

      if (!basePrice || basePrice === 0) {
        return '';
      }

      const multiplier = 1 + percentage / 100;
      const calculatedPrice = basePrice * multiplier;
      return calculatedPrice.toFixed(2);
    },
    [currentPrice, limitPrice],
  );

  const handleMidPrice = useCallback(() => {
    // Mid price is the average between ask and bid
    if (bestAsk && bestBid) {
      const midPrice = (bestAsk + bestBid) / 2;
      setLimitPrice(midPrice.toFixed(2));
    } else if (currentPrice) {
      // Fallback to current price if we don't have bid/ask
      setLimitPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, bestAsk, bestBid]);

  const handleMarkPrice = useCallback(() => {
    // Use mark price if available, otherwise fall back to current price
    const priceToUse = markPrice || currentPrice;
    if (priceToUse) {
      setLimitPrice(priceToUse.toFixed(2));
    }
  }, [currentPrice, markPrice]);

  const footerButtonProps = [
    {
      label: strings('perps.order.limit_price_modal.set'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      disabled:
        !limitPrice || limitPrice === '0' || parseFloat(limitPrice) <= 0,
    },
  ];

  // Use real bid/ask prices if available, otherwise calculate approximations
  const displayAskPrice =
    bestAsk ||
    (currentPrice
      ? currentPrice * ORDER_BOOK_SPREAD.DEFAULT_ASK_MULTIPLIER
      : 0);
  const displayBidPrice =
    bestBid ||
    (currentPrice
      ? currentPrice * ORDER_BOOK_SPREAD.DEFAULT_BID_MULTIPLIER
      : 0);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.order.limit_price_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Price info section */}
        <View style={styles.priceInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.current_price')} ({asset})
            </Text>
            <Text style={styles.priceValue}>
              {currentPrice ? formatPrice(currentPrice) : '$---'}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.ask_price')}
            </Text>
            <Text style={styles.priceValue}>
              {displayAskPrice ? formatPrice(displayAskPrice) : '$---'}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.bid_price')}
            </Text>
            <Text style={styles.priceValue}>
              {displayBidPrice ? formatPrice(displayBidPrice) : '$---'}
            </Text>
          </View>
        </View>

        {/* Limit price display */}
        <View style={styles.limitPriceDisplay}>
          <Text
            style={[
              styles.limitPriceValue,
              (!limitPrice || limitPrice === '0') && {
                color: colors.text.muted,
              },
            ]}
          >
            {!limitPrice || limitPrice === '0'
              ? strings('perps.order.limit_price')
              : limitPrice}
          </Text>
          <Text style={styles.limitPriceCurrency}>USD</Text>
        </View>

        {/* Quick percentage buttons */}
        <View style={styles.percentageButtonsRow}>
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={handleMidPrice}
          >
            <Text variant={TextVariant.BodyMD}>Mid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={handleMarkPrice}
          >
            <Text variant={TextVariant.BodyMD}>Mark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={() => setLimitPrice(calculatePriceForPercentage(-1))}
          >
            <Text variant={TextVariant.BodyMD}>-1%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={() => setLimitPrice(calculatePriceForPercentage(-2))}
          >
            <Text variant={TextVariant.BodyMD}>-2%</Text>
          </TouchableOpacity>
        </View>

        {/* Keypad */}
        <View style={styles.keypadContainer}>
          <Keypad
            value={limitPrice}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={2}
          />
        </View>
      </View>

      <View style={styles.footerContainer}>
        <BottomSheetFooter buttonPropsArray={footerButtonProps} />
      </View>
    </BottomSheet>
  );
};

PerpsLimitPriceBottomSheet.displayName = 'PerpsLimitPriceBottomSheet';

export default memo(PerpsLimitPriceBottomSheet, (prevProps, nextProps) => {
  // If bottom sheet is not visible in both states, skip re-render
  if (!prevProps.isVisible && !nextProps.isVisible) {
    return true;
  }

  // Only re-render if these critical props change
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.limitPrice === nextProps.limitPrice
  );
});
