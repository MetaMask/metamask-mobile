import React, { useCallback, useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  ListItem,
  TextColor,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { formatPriceWithSubscriptNotation } from '../../../util/number/subscriptNotation';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';
import {
  formatMarketStats,
  getCaipChainIdFromAssetId,
  getNetworkBadgeSrc,
} from '../Trending/components/TrendingTokenRowItem/utils';
import {
  getTrendingTokenRowAddButtonTestId,
  getTrendingTokenRowItemTestId,
} from '../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import TrendingTokenLogo from '../Trending/components/TrendingTokenLogo';
import { useTrendingTokenPress } from '../Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';

interface WatchlistTokenRowItemProps {
  token: TrendingAsset;
  position?: number;
  onWatchlistPress?: () => void;
  isWatchlisted?: boolean;
  tokenDetailsSource?: TokenDetailsSource;
  twClassName?: string;
}

const getPriceChangeColor = (priceChange: number) => {
  if (priceChange === 0) {
    return TextColor.TextAlternative;
  }
  return priceChange > 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
};

const WatchlistTokenRowItem = ({
  token,
  position,
  onWatchlistPress,
  isWatchlisted = false,
  tokenDetailsSource = TokenDetailsSource.WatchlistFullscreen,
  twClassName,
}: WatchlistTokenRowItemProps) => {
  const currentCurrency = useSelector(selectCurrentCurrency) || 'usd';
  const { onPress } = useTrendingTokenPress({
    token,
    index: position,
    tokenDetailsSource,
  });
  const caipChainId = useMemo(
    () => getCaipChainIdFromAssetId(token.assetId),
    [token.assetId],
  );
  const networkBadgeImageSource = useMemo(
    () => getNetworkBadgeSrc(caipChainId),
    [caipChainId],
  );
  const priceChange = Number(token.priceChangePct?.h24);
  const hasPriceChange = Number.isFinite(priceChange);
  const subvalue =
    Number(token.price) === 0
      ? '—'
      : hasPriceChange
        ? `${priceChange > 0 ? '+' : priceChange < 0 ? '-' : ''}${Math.abs(
            priceChange,
          ).toFixed(2)}%`
        : undefined;
  const handleWatchlistPress = useCallback(() => {
    onWatchlistPress?.();
  }, [onWatchlistPress]);

  return (
    <ListItem
      isInteractive
      onPress={onPress}
      testID={getTrendingTokenRowItemTestId(token.assetId)}
      avatar={
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            <BadgeNetwork src={networkBadgeImageSource} twClassName="h-5 w-5" />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={40}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
      }
      title={token.name ?? token.symbol}
      titleProps={{ numberOfLines: 1 }}
      description={`${token.symbol} · ${formatMarketStats(
        token.marketCap ?? 0,
        token.aggregatedUsdVolume ?? 0,
        currentCurrency,
      )}`}
      descriptionProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
      value={formatPriceWithSubscriptNotation(token.price, currentCurrency)}
      subvalue={subvalue}
      subvalueProps={{
        color:
          subvalue === undefined || subvalue === '—'
            ? TextColor.TextAlternative
            : getPriceChangeColor(priceChange),
      }}
      endAccessory={
        onWatchlistPress ? (
          <ButtonIcon
            iconName={isWatchlisted ? IconName.StarFilled : IconName.Star}
            size={ButtonIconSize.Md}
            onPress={handleWatchlistPress}
            accessibilityLabel={strings(
              isWatchlisted
                ? 'token_watchlist.remove_from_watchlist'
                : 'token_watchlist.add_to_watchlist',
            )}
            testID={getTrendingTokenRowAddButtonTestId(token.assetId)}
            twClassName="-mr-2"
          />
        ) : undefined
      }
      accessoryGap={onWatchlistPress ? 3 : undefined}
      twClassName={['py-2 min-h-0', twClassName].filter(Boolean).join(' ')}
    />
  );
};

export default React.memo(WatchlistTokenRowItem);
