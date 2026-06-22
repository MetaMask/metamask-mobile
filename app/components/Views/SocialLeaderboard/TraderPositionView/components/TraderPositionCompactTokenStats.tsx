import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';

export interface TraderPositionCompactTokenStatsProps {
  symbol: string;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  onTraderPress: () => void;
}

const TraderPositionCompactTokenStats: React.FC<
  TraderPositionCompactTokenStatsProps
> = ({
  symbol,
  pricePercentChange,
  activeTimePeriodLabel,
  traderName,
  traderImageUrl,
  traderAddress,
  onTraderPress,
}) => {
  const hasChange = pricePercentChange != null;
  const isPositive = (pricePercentChange ?? 0) >= 0;

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      testID={TraderPositionViewSelectorsIDs.COMPACT_TOKEN_STATS}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
        numberOfLines={1}
        testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL}
      >
        {symbol}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="max-w-full px-1"
        testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_CHANGE}
      >
        {hasChange ? (
          <>
            <Text
              variant={TextVariant.BodySm}
              twClassName={
                isPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {`${isPositive ? '+' : ''}${pricePercentChange.toFixed(1)}% `}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {activeTimePeriodLabel}
            </Text>
          </>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {'\u2014'}
          </Text>
        )}
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {' \u00b7 '}
        </Text>
        <Box twClassName="min-w-0 flex-shrink">
          <TraderHeaderIdentity
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            variant="breadcrumb"
            onPress={onTraderPress}
            testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TRADER_LINK}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default TraderPositionCompactTokenStats;
