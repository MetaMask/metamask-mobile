import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd } from '../../../../UI/Rewards/utils/formatUtils';

export interface TraderTokenInfoRowProps {
  symbol: string;
  tokenImageUrl: string | undefined;
  marketCap: number | undefined;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
}

const TraderTokenInfoRow: React.FC<TraderTokenInfoRowProps> = ({
  symbol,
  tokenImageUrl,
  marketCap,
  pricePercentChange,
  activeTimePeriodLabel,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={4}
      twClassName="flex-1 min-w-0 mr-3"
    >
      <AvatarToken
        name={symbol}
        src={tokenImageUrl ? { uri: tokenImageUrl } : undefined}
        size={AvatarTokenSize.Lg}
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {symbol}
        </Text>
        {pricePercentChange != null ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName={
              pricePercentChange >= 0
                ? 'text-success-default'
                : 'text-error-default'
            }
            numberOfLines={1}
          >
            {`${pricePercentChange >= 0 ? '+' : ''}${pricePercentChange.toFixed(1)}% `}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {activeTimePeriodLabel}
            </Text>
          </Text>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {'\u2014'}
          </Text>
        )}
      </Box>
    </Box>

    <Box alignItems={BoxAlignItems.End}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {marketCap != null ? formatCompactUsd(marketCap) : '\u2014'}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.trader_position.market_cap')}
      </Text>
    </Box>
  </Box>
);

export default TraderTokenInfoRow;
