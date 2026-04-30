import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactUsd } from '../../../../UI/Rewards/utils/formatUtils';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';

export interface TraderTokenInfoRowProps {
  symbol: string;
  position?: Position;
  marketCap: number | undefined;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  onCopyTokenAddress?: () => void;
  copyTokenAddressTestID?: string;
}

interface TraderTokenIdentityProps {
  symbol: string;
  position?: Position;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  onCopyTokenAddress?: () => void;
  copyTokenAddressTestID?: string;
}

const TraderTokenIdentity: React.FC<TraderTokenIdentityProps> = ({
  symbol,
  position,
  pricePercentChange,
  activeTimePeriodLabel,
  onCopyTokenAddress,
  copyTokenAddressTestID,
}) => {
  const tw = useTailwind();
  const canCopyTokenAddress = Boolean(
    position?.tokenAddress && onCopyTokenAddress,
  );

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={4}
    >
      {position ? (
        <PositionTokenAvatar position={position} showChainBadge />
      ) : (
        <AvatarToken name={symbol} size={AvatarTokenSize.Lg} />
      )}
      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {symbol}
          </Text>
          {canCopyTokenAddress ? (
            <Icon
              name={IconName.Copy}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          ) : null}
        </Box>
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
  );

  if (!canCopyTokenAddress) {
    return <Box twClassName="flex-1 min-w-0 mr-3">{content}</Box>;
  }

  return (
    <TouchableOpacity
      onPress={onCopyTokenAddress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={copyTokenAddressTestID}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${symbol} token address`}
      style={tw.style('flex-1 min-w-0 mr-3')}
    >
      {content}
    </TouchableOpacity>
  );
};

interface TraderMarketCapProps {
  marketCap: number | undefined;
}

const TraderMarketCap: React.FC<TraderMarketCapProps> = ({ marketCap }) => (
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
);

const TraderTokenInfoRow: React.FC<TraderTokenInfoRowProps> = ({
  symbol,
  position,
  marketCap,
  pricePercentChange,
  activeTimePeriodLabel,
  onCopyTokenAddress,
  copyTokenAddressTestID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-3"
  >
    <TraderTokenIdentity
      symbol={symbol}
      position={position}
      pricePercentChange={pricePercentChange}
      activeTimePeriodLabel={activeTimePeriodLabel}
      onCopyTokenAddress={onCopyTokenAddress}
      copyTokenAddressTestID={copyTokenAddressTestID}
    />
    <TraderMarketCap marketCap={marketCap} />
  </Box>
);

export default TraderTokenInfoRow;
