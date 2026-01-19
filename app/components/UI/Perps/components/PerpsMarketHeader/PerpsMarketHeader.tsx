import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import HeaderWithTitleLeft from '../../../../../component-library/components-temp/HeaderWithTitleLeft';
import { PerpsMarketHeaderSelectorsIDs } from '../../Perps.testIds';
import type { PerpsMarketData } from '../../controllers/types';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  formatPercentage,
} from '../../utils/formatUtils';
import { usePerpsLivePrices } from '../../hooks/stream';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import PerpsTokenLogo from '../PerpsTokenLogo';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';

interface PerpsMarketHeaderProps {
  market: PerpsMarketData;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  onFullscreenPress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  currentPrice: number;
}

interface LivePriceBottomAccessoryProps {
  symbol: string;
  currentPrice: number;
  testIDPrice?: string;
  testIDChange?: string;
}

const bottomAccessoryStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const LivePriceBottomAccessory: React.FC<LivePriceBottomAccessoryProps> = ({
  symbol,
  currentPrice,
  testIDPrice,
  testIDChange,
}) => {
  const prices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs: 1000,
  });

  const priceData = prices[symbol];

  const displayChange = useMemo(() => {
    if (!priceData) return null;
    if (priceData.percentChange24h === undefined) return null;
    return Number.parseFloat(priceData.percentChange24h);
  }, [priceData]);

  const isPositiveChange = displayChange !== null && displayChange >= 0;
  const changeColor =
    displayChange === null
      ? TextColor.Alternative
      : isPositiveChange
        ? TextColor.Success
        : TextColor.Error;

  const formattedPrice = useMemo(() => {
    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }

    try {
      return formatPerpsFiat(currentPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      });
    } catch {
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }
  }, [currentPrice]);

  const formattedChange = useMemo(() => {
    if (displayChange === null) {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }

    if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }

    try {
      return formatPercentage(displayChange.toString());
    } catch {
      return PERPS_CONSTANTS.FALLBACK_PERCENTAGE_DISPLAY;
    }
  }, [currentPrice, displayChange]);

  return (
    <View style={bottomAccessoryStyles.container}>
      <Text
        variant={TextVariant.BodySMMedium}
        color={TextColor.Alternative}
        testID={testIDPrice}
      >
        {formattedPrice}
      </Text>
      <Text
        variant={TextVariant.BodySMMedium}
        color={changeColor}
        testID={testIDChange}
      >
        {formattedChange}
      </Text>
    </View>
  );
};

const PerpsMarketHeader: React.FC<PerpsMarketHeaderProps> = ({
  market,
  onBackPress,
  onMorePress,
  onFavoritePress,
  onFullscreenPress,
  isFavorite = false,
  testID,
  currentPrice,
}) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);
  const title = `${displaySymbol}-USD`;

  const endButtonIconProps = useMemo(() => {
    const buttons: ButtonIconProps[] = [];

    if (onFullscreenPress) {
      buttons.push({
        iconName: IconName.Expand,
        onPress: onFullscreenPress,
        testID: `${testID}-fullscreen-button`,
      });
    }

    if (onFavoritePress) {
      buttons.push({
        iconName: isFavorite ? IconName.StarFilled : IconName.Star,
        onPress: onFavoritePress,
      });
    } else if (onMorePress) {
      buttons.push({
        iconName: IconName.MoreVertical,
        onPress: onMorePress,
      });
    }

    return buttons.length > 0 ? buttons : undefined;
  }, [onFullscreenPress, onFavoritePress, onMorePress, isFavorite, testID]);

  return (
    <HeaderWithTitleLeft
      onBack={onBackPress}
      backButtonProps={{
        testID: PerpsMarketHeaderSelectorsIDs.BACK_BUTTON,
      }}
      endButtonIconProps={endButtonIconProps}
      testID={testID}
      titleLeftProps={{
        title,
        titleAccessory: market.maxLeverage ? (
          <PerpsLeverage maxLeverage={market.maxLeverage} />
        ) : undefined,
        bottomAccessory: (
          <LivePriceBottomAccessory
            symbol={market.symbol}
            currentPrice={currentPrice}
            testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
            testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
          />
        ),
        endAccessory: <PerpsTokenLogo symbol={market.symbol} size={48} />,
      }}
    />
  );
};

export default PerpsMarketHeader;
