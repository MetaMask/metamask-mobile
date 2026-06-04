import React, { useMemo } from 'react';
import { getPerpsMarketRowItemSelector } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Card,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLiveMarket } from '../../hooks/stream';
import { getMarketBadgeType } from '../../utils/marketUtils';
import { formatFundingRate } from '../../utils/formatUtils';
import PerpsBadge from '../PerpsBadge';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';

const PerpsMarketRowItem = ({
  market,
  onPress,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  displayMetric = 'volume',
  showBadge = false,
  compact = false,
}: PerpsMarketRowItemProps) => {
  const displayMarket = usePerpsLiveMarket(market);

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

  return (
    <Card
      onPress={handlePress}
      testID={getPerpsMarketRowItemSelector.rowItem(market.symbol)}
      touchableOpacityProps={{ activeOpacity: 0.7 }}
      twClassName={`flex-row justify-between items-center border-0 rounded-none bg-transparent px-0 ${compact ? 'py-2' : 'py-3'}`}
    >
      {/* Left section: Icon + token info */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1"
      >
        <Box marginRight={4}>
          <PerpsTokenLogo
            symbol={displayMarket.symbol}
            size={iconSize}
            recyclingKey={displayMarket.symbol}
            testID={getPerpsMarketRowItemSelector.tokenLogo(
              displayMarket.symbol,
            )}
          />
        </Box>

        <Box twClassName="flex-1">
          {/* Symbol + leverage */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {getPerpsDisplaySymbol(displayMarket.symbol)}
            </Text>
            <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
          </Box>

          {/* Metric row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="mt-0.5"
          >
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              numberOfLines={1}
            >
              {displayText}
            </Text>
            {showBadge && badgeType && (
              <PerpsBadge
                type={badgeType}
                testID={getPerpsMarketRowItemSelector.badge(
                  displayMarket.symbol,
                )}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Right section: Price + change */}
      <Box
        alignItems={BoxAlignItems.End}
        justifyContent={BoxJustifyContent.End}
        gap={1}
        twClassName="flex-1"
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {displayMarket.price}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={isPositiveChange ? TextColor.Success : TextColor.Error}
        >
          {displayMarket.change24hPercent}
        </Text>
      </Box>
    </Card>
  );
};

export default React.memo(PerpsMarketRowItem);
