import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
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
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- shared Perps stream provider (UI layer, not a route)
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../UI/Perps/utils/formatUtils';
import { formatCompactUsd } from '../../../../UI/Rewards/utils/formatUtils';
import PerpBadges from '../../components/PerpBadges';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import { formatPercent } from '../../utils/formatters';
import { getPerpPositionDirection, isPerpPosition } from '../../utils/perp';
import { usePerpMarketNavigationTarget } from '../hooks/usePerpMarketNavigationTarget';

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
  /** Raw perp market symbol (may carry a HIP-3 prefix); enables the perp market link. */
  perpMarketSymbol?: string;
  /** Called with the resolved xyz market symbol when the perp token box is tapped. */
  onTokenNavigate?: (targetSymbol: string) => void;
  /** Opens the spot token page when the (spot) token box is tapped. */
  onTokenPress?: () => void;
  /** testID for the token nav Pressable (perp market link or spot token link). */
  tokenNavigateTestID?: string;
}

interface TraderTokenIdentityProps {
  symbol: string;
  position?: Position;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  onCopyTokenAddress?: () => void;
  copyTokenAddressTestID?: string;
  perpMarketSymbol?: string;
  onTokenNavigate?: (targetSymbol: string) => void;
  onTokenPress?: () => void;
  tokenNavigateTestID?: string;
}

interface TokenIdentityPerpLinkProps {
  /** Raw perp market symbol used to resolve the tradable market. */
  symbol: string;
  /** Display symbol used for the accessibility label. */
  displaySymbol: string;
  onTrade: (targetSymbol: string) => void;
  testID?: string;
  children: React.ReactNode;
}

const TokenIdentityPerpLinkInner: React.FC<TokenIdentityPerpLinkProps> = ({
  symbol,
  displaySymbol,
  onTrade,
  testID,
  children,
}) => {
  const tw = useTailwind();
  const { targetSymbol, isSupported } = usePerpMarketNavigationTarget(symbol);

  // Mirror the disabled Trade CTA — never link to an unsupported market.
  if (!isSupported) {
    return <Box twClassName="flex-1 min-w-0 mr-3">{children}</Box>;
  }

  return (
    <Pressable
      onPress={() => onTrade(targetSymbol)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={strings(
        'social_leaderboard.trader_position.view_market',
        { symbol: displaySymbol },
      )}
      style={({ pressed }) => [
        tw.style('flex-1 min-w-0 mr-3'),
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      {children}
    </Pressable>
  );
};

/**
 * Wraps the perp token identity in a tap target that navigates to the market
 * page (same navigation as the Trade CTA). Self-contained PerpsStreamProvider,
 * mirroring TraderPositionHeaderTokenLink / PerpsTradeButton.
 */
const TokenIdentityPerpLink: React.FC<TokenIdentityPerpLinkProps> = (props) => (
  <PerpsStreamProvider>
    <TokenIdentityPerpLinkInner {...props} />
  </PerpsStreamProvider>
);

const TraderTokenIdentity: React.FC<TraderTokenIdentityProps> = ({
  symbol,
  position,
  pricePercentChange,
  activeTimePeriodLabel,
  onCopyTokenAddress,
  copyTokenAddressTestID,
  perpMarketSymbol,
  onTokenNavigate,
  onTokenPress,
  tokenNavigateTestID,
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
            twClassName="shrink leading-none"
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
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {pricePercentChange != null ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName={`shrink ${
                pricePercentChange >= 0
                  ? 'text-success-default'
                  : 'text-error-default'
              }`}
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
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {'\u2014'}
            </Text>
          )}
          {/* Same copy control as the token page (see TokenDetailsInlineHeader):
              trails the secondary line and is its own tap target, so it copies
              without triggering the surrounding token navigation. */}
          {canCopyTokenAddress ? (
            <ButtonIcon
              iconName={IconName.Copy}
              size={ButtonIconSize.Xs}
              onPress={onCopyTokenAddress}
              iconProps={{
                color: IconColor.IconAlternative,
                size: IconSize.Sm,
              }}
              testID={copyTokenAddressTestID}
              accessibilityLabel={strings('token.contract_address')}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );

  // The identity (avatar + symbol + change) is the navigation target: perps
  // link to the market page (same nav as the Trade CTA), spot links to the
  // token page. The copy control lives inline at the end of the secondary line
  // (see `content`) and captures its own taps, so copying never navigates.
  if (isPerp && onTokenNavigate && perpMarketSymbol) {
    return (
      <TokenIdentityPerpLink
        symbol={perpMarketSymbol}
        displaySymbol={symbol}
        onTrade={onTokenNavigate}
        testID={tokenNavigateTestID}
      >
        {content}
      </TokenIdentityPerpLink>
    );
  }

  if (onTokenPress) {
    return (
      <Pressable
        onPress={onTokenPress}
        testID={tokenNavigateTestID}
        accessibilityRole="button"
        accessibilityLabel={strings(
          'social_leaderboard.trader_position.view_token',
          { symbol },
        )}
        style={({ pressed }) => [
          tw.style('flex-1 min-w-0 mr-3'),
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <Box twClassName="flex-1 min-w-0 mr-3">{content}</Box>;
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
  perpMarketSymbol,
  onTokenNavigate,
  onTokenPress,
  tokenNavigateTestID,
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
      perpMarketSymbol={perpMarketSymbol}
      onTokenNavigate={onTokenNavigate}
      onTokenPress={onTokenPress}
      tokenNavigateTestID={tokenNavigateTestID}
    />
    <TraderHeaderStat
      isPerp={position ? isPerpPosition(position) : false}
      marketCap={marketCap}
      currentPrice={currentPrice}
    />
  </Box>
);

export default TraderTokenInfoRow;
