import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getPerpsMarketRowItemSelector } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
  ListItem,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLivePrices } from '../../hooks/stream';
import { getMarketBadgeType } from '../../utils/marketUtils';
import {
  formatFundingRate,
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import PerpsBadge from '../PerpsBadge';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';
import { selectPerpsShowFullAssetNamesFlag } from '../../selectors/featureFlags';

const PerpsMarketRowItem = ({
  market,
  onPress,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  displayMetric = 'volume',
  showBadge = false,
  compact = false,
  onAddPress,
}: PerpsMarketRowItemProps) => {
  // Subscribe to live prices for just this symbol
  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 3000, // 3 seconds for list view
  });

  const showFullAssetNames = useSelector(selectPerpsShowFullAssetNamesFlag);

  // Merge live price into market data
  const displayMarket = useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice) {
      return market;
    }

    const currentPrice = parseFloat(livePrice.price);

    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    const fundingRateChanged =
      livePrice.funding !== undefined &&
      livePrice.funding !== market.fundingRate;

    if (comparisonPrice === market.price && !fundingRateChanged) {
      return market;
    }

    const updatedMarket: PerpsMarketData = {
      ...market,
      price: formattedPrice,
    };

    if (livePrice.percentChange24h) {
      const changePercent = parseFloat(livePrice.percentChange24h);
      updatedMarket.change24hPercent = formatPercentage(changePercent);

      // If current price is P and change is x%, price 24h ago = P / (1 + x/100)
      const divisor = 1 + changePercent / 100;
      const priceChange =
        divisor !== 0 ? currentPrice - currentPrice / divisor : -currentPrice;
      updatedMarket.change24h = formatPnl(priceChange);
    }

    if (livePrice.volume24h !== undefined) {
      const volume = livePrice.volume24h;
      if (volume > 0) {
        updatedMarket.volume = formatVolume(volume);
      } else {
        updatedMarket.volume = PERPS_CONSTANTS.ZeroAmountDetailedDisplay;
      }
    } else if (
      !market.volume ||
      market.volume === PERPS_CONSTANTS.ZeroAmountDisplay
    ) {
      updatedMarket.volume = PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    if (livePrice.funding !== undefined) {
      updatedMarket.fundingRate = livePrice.funding;
    }

    return updatedMarket;
  }, [market, livePrices]);

  const handlePress = () => {
    onPress?.(displayMarket);
  };

  const getDisplayValue = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return displayMarket.change24hPercent;
      case 'openInterest':
        return (
          displayMarket.openInterest || PERPS_CONSTANTS.FallbackPriceDisplay
        );
      case 'fundingRate':
        return formatFundingRate(displayMarket.fundingRate);
      case 'volume':
      default:
        return displayMarket.volume;
    }
  }, [displayMetric, displayMarket]);

  const getMetricLabel = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return '';
      case 'openInterest':
        return strings('perps.sort.open_interest_short');
      case 'fundingRate':
        return strings('perps.sort.funding_rate_short');
      case 'volume':
      default:
        return strings('perps.sort.volume_short');
    }
  }, [displayMetric]);

  const displayText = getMetricLabel
    ? `${getDisplayValue} ${getMetricLabel}`
    : getDisplayValue;

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  const badgeType = getMarketBadgeType(displayMarket);

  const assetLabel = useMemo(() => {
    const label =
      showFullAssetNames && displayMarket.name
        ? displayMarket.name
        : displayMarket.symbol;
    return getPerpsDisplaySymbol(label);
  }, [showFullAssetNames, displayMarket.name, displayMarket.symbol]);

  // Only show the ticker alongside the metric text when the row is already
  // displaying the full name (otherwise the ticker is redundant) and the
  // name is a genuine name rather than the ticker-fallback value returned
  // when Terminal API / HyperLiquid name resolution has no real name for
  // this market.
  const showTickerSuffix = useMemo(
    () =>
      showFullAssetNames &&
      Boolean(displayMarket.name) &&
      displayMarket.name !== displayMarket.symbol &&
      getPerpsDisplaySymbol(displayMarket.symbol) !== displayMarket.name,
    [showFullAssetNames, displayMarket.name, displayMarket.symbol],
  );

  const description = showTickerSuffix
    ? `${getPerpsDisplaySymbol(displayMarket.symbol)} \u00B7 ${displayText}`
    : displayText;

  return (
    <ListItem
      isInteractive
      onPress={handlePress}
      testID={getPerpsMarketRowItemSelector.rowItem(market.symbol)}
      avatar={
        <PerpsTokenLogo
          symbol={displayMarket.symbol}
          size={iconSize}
          recyclingKey={displayMarket.symbol}
          testID={getPerpsMarketRowItemSelector.tokenLogo(displayMarket.symbol)}
        />
      }
      title={assetLabel}
      titleProps={{
        testID: getPerpsMarketRowItemSelector.assetLabel(displayMarket.symbol),
        numberOfLines: 1,
      }}
      titleEndAccessory={
        <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
      }
      description={description}
      descriptionEndAccessory={
        showBadge && badgeType ? (
          <PerpsBadge
            type={badgeType}
            testID={getPerpsMarketRowItemSelector.badge(displayMarket.symbol)}
          />
        ) : undefined
      }
      value={displayMarket.price}
      subvalue={displayMarket.change24hPercent}
      subvalueProps={{
        color: isPositiveChange
          ? TextColor.SuccessDefault
          : TextColor.ErrorDefault,
      }}
      endAccessory={
        onAddPress ? (
          <ButtonIcon
            iconName={IconName.Add}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
            onPress={() => onAddPress(displayMarket)}
            testID={getPerpsMarketRowItemSelector.addButton(
              displayMarket.symbol,
            )}
          />
        ) : undefined
      }
      accessoryGap={onAddPress ? 3 : undefined}
      twClassName={compact ? 'py-2 min-h-0' : undefined}
    />
  );
};

export default React.memo(PerpsMarketRowItem);
