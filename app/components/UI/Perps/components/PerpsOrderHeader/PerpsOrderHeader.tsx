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
import { usePerpsLiveHeaderPrice } from '../../hooks/stream';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsTokenLogo from '../PerpsTokenLogo';

// No artificial throttle for the % change subscription inside LivePriceHeader:
// unlike PerpsOrderView / PerpsClosePositionView's own price subscription
// (which drives expensive fee/margin/validation recompute and is deliberately
// throttled to 1000ms), this only feeds a lightweight Text node inside a
// memoized leaf component.
const HEADER_PERCENT_CHANGE_THROTTLE_MS = 0;

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

  // Use the same candle-derived, unthrottled price source that makes the
  // market details header feel instantaneous (see usePerpsLiveHeaderPrice),
  // instead of relying solely on the `price` prop. PerpsOrderView /
  // PerpsClosePositionView recompute fees, margin, liquidation price, and
  // validation on every allMids price tick, so their own re-render can lag
  // behind the WebSocket feed, and even the allMids feed itself updates less
  // frequently than the candle stream a chart would use. Because this
  // subscription's state lives inside PerpsOrderHeader (a small, cheap
  // subtree), its updates render independently of that heavier parent. The
  // `price` prop is kept as the value to show until this subscription
  // delivers its first update.
  const { price: livePrice } = usePerpsLiveHeaderPrice(asset);

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
        throttleMs={HEADER_PERCENT_CHANGE_THROTTLE_MS}
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
