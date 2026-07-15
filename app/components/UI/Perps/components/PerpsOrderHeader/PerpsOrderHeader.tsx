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
import { usePerpsLiveFocusedPrice } from '../../hooks/stream';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsTokenLogo from '../PerpsTokenLogo';

interface PerpsOrderHeaderProps {
  asset: string;
  price: number;
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

  // Fast, single-symbol focused price (~0.5s activeAssetCtx cadence,
  // TAT-3334) — the same source PerpsOrderView already uses for its own
  // fee/margin/validation calculations. Subscribing again here (rather than
  // only reading the `price` prop) puts the resulting setState inside
  // PerpsOrderHeader's own subtree, so its render is independent of the
  // parent's heavier recompute cycle.
  //
  // FocusedPriceStreamChannel is a shared, reference-counted singleton keyed
  // by symbol, so this does not open a second WebSocket connection when the
  // parent (PerpsOrderView) already subscribes to the same symbol — both
  // subscribers share one connection and both receive every tick.
  //
  // price and percentChange24h come from the SAME PriceUpdate object on the
  // SAME tick, so — unlike two independent subscriptions — they can never
  // disagree with each other. The `price` prop is kept as the fallback shown
  // until this subscription delivers its first update for the current
  // symbol (including right after an asset change, until the channel
  // resolves the new symbol).
  const focusedPriceUpdate = usePerpsLiveFocusedPrice({ symbol: asset });

  const displayPrice = useMemo(() => {
    const parsed = Number.parseFloat(focusedPriceUpdate?.price ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : price;
  }, [focusedPriceUpdate?.price, price]);

  const percentChange24h = useMemo(() => {
    const parsed = Number.parseFloat(
      focusedPriceUpdate?.percentChange24h ?? '',
    );
    return Number.isFinite(parsed) ? parsed : null;
  }, [focusedPriceUpdate]);

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
        currentPrice={displayPrice}
        percentChange24h={percentChange24h}
      />
    ),
    [asset, displayPrice, percentChange24h],
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
