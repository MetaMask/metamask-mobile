import { useNavigation } from '@react-navigation/native';
import {
  HeaderSubpage,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo } from 'react';
import {
  getPerpsDisplaySymbol,
  type OrderType,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { PerpsOrderHeaderSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLivePrices } from '../../hooks/stream';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsTokenLogo from '../PerpsTokenLogo';

// No artificial throttle: unlike PerpsOrderView / PerpsClosePositionView's own
// price subscription (which drives expensive fee/margin/validation recompute
// and is deliberately throttled to 1000ms), this subscription only feeds a
// couple of Text nodes inside a memoized leaf component. Matches the market
// details header, which is effectively unthrottled (driven directly by chart
// ticks) — see PerpsMarketTradesList for the same "instant" pattern applied
// to a different lightweight display.
const HEADER_PRICE_THROTTLE_MS = 0;

interface PerpsOrderHeaderProps {
  asset: string;
  price: number;
  priceChange?: number;
  orderType?: OrderType;
  direction?: 'long' | 'short';
  onBack?: () => void;
  title?: string;
  onOrderTypePress?: () => void;
  isLoading?: boolean;
}

const PerpsOrderHeader: React.FC<PerpsOrderHeaderProps> = ({
  asset,
  price,
  orderType,
  direction = 'long',
  onBack,
  onOrderTypePress,
  title,
  isLoading,
}) => {
  const navigation = useNavigation();

  // Subscribe to live prices directly in the header instead of relying solely
  // on the `price` prop. PerpsOrderView / PerpsClosePositionView recompute
  // fees, margin, liquidation price, and validation on every price tick, so
  // their own re-render can lag behind the WebSocket feed on lower-end
  // devices. Because this subscription's state lives inside PerpsOrderHeader
  // (a small, cheap subtree), its updates render independently of that
  // heavier parent, keeping the header as responsive as the market details
  // page. The `price` prop is kept as the value to show until this
  // subscription delivers its first update.
  const livePrices = usePerpsLivePrices({
    symbols: [asset],
    throttleMs: HEADER_PRICE_THROTTLE_MS,
  });

  const livePrice = useMemo(() => {
    const rawPrice = livePrices[asset]?.price;
    if (!rawPrice) {
      return undefined;
    }
    const parsed = Number.parseFloat(rawPrice);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [livePrices, asset]);

  const displayPrice = livePrice ?? price;

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [navigation, onBack]);

  const handleOrderTypePress = useCallback(() => {
    onOrderTypePress?.();
  }, [onOrderTypePress]);

  const displayTitle = useMemo(
    () =>
      title ||
      `${
        direction === 'long'
          ? strings('perps.market.long')
          : strings('perps.market.short')
      } ${getPerpsDisplaySymbol(asset)}`,
    [asset, direction, title],
  );

  const orderTypeLabel = useMemo(() => {
    if (!orderType) {
      return undefined;
    }

    return orderType === 'market'
      ? strings('perps.order.market')
      : strings('perps.order.limit');
  }, [orderType]);

  const description = useMemo(
    () => (
      <LivePriceHeader
        symbol={asset}
        throttleMs={HEADER_PRICE_THROTTLE_MS}
        currentPrice={displayPrice}
      />
    ),
    [asset, displayPrice],
  );

  const endAccessory = useMemo(() => {
    if (!orderType || !orderTypeLabel) {
      return undefined;
    }

    return (
      <SelectButton
        testID={PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON}
        variant={SelectButtonVariant.Primary}
        size={SelectButtonSize.Md}
        placeholder={orderTypeLabel}
        value={orderTypeLabel}
        onPress={handleOrderTypePress}
        isDisabled={isLoading}
      />
    );
  }, [handleOrderTypePress, isLoading, orderType, orderTypeLabel]);

  return (
    <HeaderSubpage
      includesTopInset
      twClassName="min-h-14 h-auto bg-default justify-center pr-4"
      testID={PerpsOrderHeaderSelectorsIDs.HEADER}
      onBack={handleBack}
      backButtonProps={{
        testID: PerpsOrderHeaderSelectorsIDs.BACK_BUTTON,
      }}
      avatar={<PerpsTokenLogo symbol={asset} size={40} />}
      title={displayTitle}
      titleProps={{ testID: PerpsOrderHeaderSelectorsIDs.ASSET_TITLE }}
      description={description}
      endAccessory={endAccessory}
    />
  );
};

export default PerpsOrderHeader;
