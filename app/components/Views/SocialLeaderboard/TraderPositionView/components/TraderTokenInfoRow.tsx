import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../UI/Perps/utils/formatUtils';
import { formatCompactUsd } from '../../../../UI/Rewards/utils/formatUtils';
import PerpBadges from '../../components/PerpBadges';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import { formatPercent } from '../../utils/formatters';
import { getPerpPositionDirection, isPerpPosition } from '../../utils/perp';

export interface TraderTokenInfoRowProps {
  symbol: string;
  position?: Position;
  marketCap: number | undefined;
  /** Latest price; shown in place of market cap for perps. */
  currentPrice?: number | undefined;
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
  // Perps have no on-chain token address — `tokenAddress` carries the perp
  // symbol — so copying it is meaningless. Only spot positions expose copy.
  const isPerp = position ? isPerpPosition(position) : false;
  const canCopyTokenAddress = Boolean(
    position?.tokenAddress && onCopyTokenAddress && !isPerp,
  );
  const perpDirection = position ? getPerpPositionDirection(position) : null;

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
          gap={2}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
          >
            {symbol}
          </Text>
          {perpDirection ? (
            <PerpBadges
              direction={perpDirection}
              leverage={position?.perpLeverage}
              testID="trader-position-perp-badges"
            />
          ) : null}
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
            {formatPercent(pricePercentChange)}{' '}
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

interface TraderHeaderStatProps {
  isPerp: boolean;
  marketCap: number | undefined;
  currentPrice: number | undefined;
}

/**
 * Top-right header stat. Perps have no market cap, so they surface the current
 * price instead; spot positions keep the market cap.
 */
const TraderHeaderStat: React.FC<TraderHeaderStatProps> = ({
  isPerp,
  marketCap,
  currentPrice,
}) => {
  const value = isPerp
    ? currentPrice != null
      ? formatPerpsFiat(currentPrice, { ranges: PRICE_RANGES_UNIVERSAL })
      : '\u2014'
    : marketCap != null
      ? formatCompactUsd(marketCap)
      : '\u2014';

  return (
    <Box alignItems={BoxAlignItems.End}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {value}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings(
          isPerp
            ? 'social_leaderboard.trader_position.price'
            : 'social_leaderboard.trader_position.market_cap',
        )}
      </Text>
    </Box>
  );
};

const TraderTokenInfoRow: React.FC<TraderTokenInfoRowProps> = ({
  symbol,
  position,
  marketCap,
  currentPrice,
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
    <TraderHeaderStat
      isPerp={position ? isPerpPosition(position) : false}
      marketCap={marketCap}
      currentPrice={currentPrice}
    />
  </Box>
);

export default TraderTokenInfoRow;
