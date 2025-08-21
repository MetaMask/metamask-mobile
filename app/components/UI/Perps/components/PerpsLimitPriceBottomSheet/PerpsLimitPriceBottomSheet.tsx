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
import { usePerpsLivePrices } from '../../hooks/stream';
import { ORDER_BOOK_SPREAD } from '../../constants/hyperLiquidConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

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

  // Get real-time price data with 1000ms throttle for limit price bottom sheet
  // Only subscribe when visible
  const priceData = usePerpsLivePrices({
    symbols: isVisible ? [asset] : [],
    throttleMs: 1000,
  });
  const currentPriceData = priceData[asset];

  // Use live data directly - updates automatically every 1000ms
  const currentPrice = currentPriceData?.price
    ? parseFloat(currentPriceData.price)
    : passedCurrentPrice;

  const markPrice = currentPriceData?.markPrice
    ? parseFloat(currentPriceData.markPrice)
    : currentPrice;

  const bestBid = currentPriceData?.bestBid
    ? parseFloat(currentPriceData.bestBid)
    : currentPrice
    ? currentPrice * ORDER_BOOK_SPREAD.DEFAULT_BID_MULTIPLIER
    : undefined;

  const bestAsk = currentPriceData?.bestAsk
    ? parseFloat(currentPriceData.bestAsk)
    : currentPrice
    ? currentPrice * ORDER_BOOK_SPREAD.DEFAULT_ASK_MULTIPLIER
    : undefined;

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    // Remove any formatting (commas, dollar signs) before passing the value
    const cleanPrice = limitPrice.replace(/[$,]/g, '');
    onConfirm(cleanPrice);
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
      // Use the current market price (not limit price) for percentage calculations
      const basePrice = currentPrice;

      if (!basePrice || basePrice === 0) {
        return '';
      }

      const multiplier = 1 + percentage / 100;
      const calculatedPrice = basePrice * multiplier;
      return formatPrice(calculatedPrice, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });
    },
    [currentPrice],
  );

  const handleMidPrice = useCallback(() => {
    // Mid price is the average between ask and bid
    if (bestAsk && bestBid) {
      const midPrice = (bestAsk + bestBid) / 2;
      setLimitPrice(
        formatPrice(midPrice, { minimumDecimals: 2, maximumDecimals: 2 }),
      );
    } else if (currentPrice) {
      // Fallback to current price if we don't have bid/ask
      setLimitPrice(
        formatPrice(currentPrice, { minimumDecimals: 2, maximumDecimals: 2 }),
      );
    }
  }, [currentPrice, bestAsk, bestBid]);

  const handleMarkPrice = useCallback(() => {
    // Use mark price if available, otherwise fall back to current price
    const priceToUse = markPrice || currentPrice;
    if (priceToUse) {
      setLimitPrice(
        formatPrice(priceToUse, { minimumDecimals: 2, maximumDecimals: 2 }),
      );
    }
  }, [currentPrice, markPrice]);

  const footerButtonProps = [
    {
      label: strings('perps.order.limit_price_modal.set'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      disabled:
        !limitPrice ||
        limitPrice === '0' ||
        parseFloat(limitPrice.replace(/[$,]/g, '')) <= 0,
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
              {currentPrice
                ? formatPrice(currentPrice, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  })
                : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.ask_price')}
            </Text>
            <Text style={styles.priceValue}>
              {displayAskPrice
                ? formatPrice(displayAskPrice, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  })
                : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.bid_price')}
            </Text>
            <Text style={styles.priceValue}>
              {displayBidPrice
                ? formatPrice(displayBidPrice, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  })
                : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
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
              : formatPrice(limitPrice, {
                  minimumDecimals: 2,
                  maximumDecimals: 2,
                })}
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

// Enable WDYR tracking in development
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PerpsLimitPriceBottomSheet as any).whyDidYouRender = {
    logOnDifferentValues: true,
    customName: 'PerpsLimitPriceBottomSheet',
  };
}

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
