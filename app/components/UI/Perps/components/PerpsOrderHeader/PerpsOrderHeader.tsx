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
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsTokenLogo from '../PerpsTokenLogo';

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
      <LivePriceHeader symbol={asset} throttleMs={1000} currentPrice={price} />
    ),
    [asset, price],
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
