import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import Keypad from '../../../Ramp/Aggregator/components/Keypad';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { formatPrice } from '../../utils/formatUtils';
import { usePerpsPrices } from '../../hooks';

interface LimitPriceRouteParams {
  asset: string; // The asset symbol to get prices for
  limitPrice?: string;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    priceInfo: {
      marginTop: 8,
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
    },
    limitPriceDisplay: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    limitPriceValue: {
      fontSize: 32,
      fontWeight: '600',
      color: colors.text.default,
    },
    limitPriceCurrency: {
      fontSize: 18,
      color: colors.text.alternative,
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    percentageButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    keypadContainer: {
      marginTop: 16,
      marginBottom: 16,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
  });

const PerpsLimitPriceBottomSheet: React.FC = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<{ params: LimitPriceRouteParams }, 'params'>>();
  const { asset, limitPrice: initialLimitPrice } = route.params || {};

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Initialize with initial limit price or empty to show placeholder
  const [limitPrice, setLimitPrice] = useState(initialLimitPrice || '');

  // Get real-time price data with order book for the asset
  const assetSymbols = useMemo(() => [asset || 'BTC'], [asset]);
  const priceData = usePerpsPrices(assetSymbols, true); // include order book data
  const currentPriceData = priceData[asset || 'BTC'];

  // Extract values from real-time data
  const currentPrice = parseFloat(currentPriceData?.price || '0');
  const markPrice = currentPriceData?.markPrice
    ? parseFloat(currentPriceData.markPrice)
    : currentPrice;
  const bestBid = currentPriceData?.bestBid
    ? parseFloat(currentPriceData.bestBid)
    : undefined;
  const bestAsk = currentPriceData?.bestAsk
    ? parseFloat(currentPriceData.bestAsk)
    : undefined;

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleConfirm = () => {
    navigation.navigate(Routes.PERPS.ORDER, {
      limitPriceUpdate: limitPrice,
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setLimitPrice(value || '');
    },
    [],
  );

  const calculatePriceForPercentage = useCallback(
    (percentage: number) => {
      if (!currentPrice || currentPrice === 0) {
        return '';
      }
      const multiplier = 1 + percentage / 100;
      const calculatedPrice = currentPrice * multiplier;
      return calculatedPrice.toFixed(2);
    },
    [currentPrice],
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
  const displayAskPrice = bestAsk || (currentPrice ? currentPrice * 1.0001 : 0);
  const displayBidPrice = bestBid || (currentPrice ? currentPrice * 0.9999 : 0);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.order.limit_price_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Price info section */}
        <View style={styles.priceInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {strings('perps.order.limit_price_modal.current_price')}
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
            <Text variant={TextVariant.BodyMD}>↓ 1%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={() => setLimitPrice(calculatePriceForPercentage(-2))}
          >
            <Text variant={TextVariant.BodyMD}>↓ 2%</Text>
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

export default PerpsLimitPriceBottomSheet;
