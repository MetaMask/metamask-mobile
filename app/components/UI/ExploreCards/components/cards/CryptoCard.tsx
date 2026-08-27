import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { isCaipChainId } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import { useTrendingTokenPress } from '../../../Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../../Bridge/types';
import { getTrendingTokenImageUrl } from '../../../Trending/utils/getTrendingTokenImageUrl';
import {
  caipChainIdToHex,
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
} from '../../../Trending/components/TrendingTokenRowItem/utils';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { strings } from '../../../../../../locales/i18n';
import CardFrame from '../CardFrame';
import { formatCompactUsd } from '../../utils/formatCompactUsd';
import { trackExploreCardsCta } from '../../utils/exploreCardsAnalytics';

const formatPct = (raw?: string): { label: string; color: TextColor } => {
  const value = raw ? parseFloat(raw) : NaN;
  if (Number.isNaN(value)) {
    return { label: '—', color: TextColor.TextAlternative };
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const color =
    value > 0
      ? TextColor.SuccessDefault
      : value < 0
        ? TextColor.ErrorDefault
        : TextColor.TextAlternative;
  return { label: `${sign}${Math.abs(value).toFixed(2)}%`, color };
};

export interface CryptoCardProps {
  token: TrendingAsset;
  rank: number;
}

const styles = StyleSheet.create({
  // BadgeWrapper hardcodes alignSelf: 'flex-start'; recenter it.
  badgeWrapper: { alignSelf: 'center' },
});

/** Spot token card: 1h change hero stat + a Swap CTA (buy intent). */
const CryptoCard: React.FC<CryptoCardProps> = ({ token, rank }) => {
  const currentCurrency = useSelector(selectCurrentCurrency) || 'usd';

  const { onPress: openAssetDetail } = useTrendingTokenPress({
    token,
    tokenDetailsSource: TokenDetailsSource.Trending,
  });

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TrendingExplore,
    sourcePage: 'explore_cards',
  });

  const destToken = useMemo((): BridgeToken | undefined => {
    const [caipChainId, assetIdentifier] = token.assetId.split('/');
    if (!isCaipChainId(caipChainId)) return undefined;
    const isEvmChain = caipChainId.startsWith('eip155:');
    const isNativeToken = assetIdentifier?.startsWith('slip44:');
    const address = isNativeToken
      ? NATIVE_SWAPS_TOKEN_ADDRESS
      : assetIdentifier?.split(':')[1];
    if (!address) return undefined;
    return {
      address: isEvmChain ? address : token.assetId,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      chainId: isEvmChain ? caipChainIdToHex(caipChainId) : caipChainId,
      image: getTrendingTokenImageUrl(token.assetId),
    };
  }, [token]);

  const networkBadgeImageSource = useMemo(
    () => getNetworkBadgeSource(getCaipChainIdFromAssetId(token.assetId)),
    [token.assetId],
  );

  const handleBodyPress = useCallback(() => {
    void openAssetDetail();
  }, [openAssetDetail]);

  const handleSwap = useCallback(() => {
    trackExploreCardsCta('crypto', 'swap', token.assetId);
    goToSwaps(undefined, destToken);
  }, [goToSwaps, destToken, token.assetId]);

  const heroChange = formatPct(token.priceChangePct?.h1);
  const dayChange = formatPct(token.priceChangePct?.h24);

  return (
    <CardFrame
      type="crypto"
      rank={rank}
      onBodyPress={handleBodyPress}
      testID={`explore-card-crypto-${token.assetId}`}
      cta={
        <Button size={ButtonBaseSize.Lg} isFullWidth onPress={handleSwap}>
          {strings('explore_cards.cta_swap')}
        </Button>
      }
    >
      <Box twClassName="flex-1 items-center justify-center gap-1">
        <BadgeWrapper
          style={styles.badgeWrapper}
          badgePosition={BadgePosition.BottomRight}
          anchorSize={{ width: 72, height: 72 }}
          badgeElement={
            <BadgeNetwork
              size={AvatarSize.Sm}
              imageSource={networkBadgeImageSource}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={72}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
          twClassName="mt-3"
        >
          {token.symbol}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {token.name}
        </Text>
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Medium}
          twClassName="mt-1"
        >
          {formatPriceWithSubscriptNotation(token.price, currentCurrency)}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={heroChange.color}
        >
          {heroChange.label}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('explore_cards.stat_hero_window')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4 mt-3"
        >
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodySm} color={dayChange.color}>
              {dayChange.label}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('explore_cards.stat_24h')}
            </Text>
          </Box>
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodySm}>
              {formatCompactUsd(token.aggregatedUsdVolume)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('explore_cards.stat_volume')}
            </Text>
          </Box>
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodySm}>
              {formatCompactUsd(token.marketCap)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('explore_cards.stat_market_cap')}
            </Text>
          </Box>
        </Box>
      </Box>
    </CardFrame>
  );
};

export default CryptoCard;
