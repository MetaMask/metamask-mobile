import React, { useCallback, useMemo, type ComponentProps } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  ListItem,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { formatPriceWithSubscriptNotation } from '../../../util/number/subscriptNotation';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';
import { useTrendingTokenPress } from '../Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';
import {
  getCaipChainIdFromAssetId,
  getNetworkBadgeSrc,
  formatMarketStats,
} from '../Trending/components/TrendingTokenRowItem/utils';
import TrendingTokenLogo from '../Trending/components/TrendingTokenLogo';
import {
  getTrendingTokenRowAddButtonTestId,
  getTrendingTokenRowItemTestId,
} from '../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';

interface WatchlistTokenRowItemProps {
  token: TrendingAsset;
  position?: number;
  onPress?: (token: TrendingAsset) => void;
  onLongPress?: () => void;
  onAddPress?: () => void;
  onWatchlistPress?: () => void;
  isWatchlisted?: boolean;
  showTypeTag?: boolean;
  tokenDetailsSource?: TokenDetailsSource;
  twClassName?: string;
  accessibilityActions?: ComponentProps<
    typeof ListItem
  >['accessibilityActions'];
  onAccessibilityAction?: ComponentProps<
    typeof ListItem
  >['onAccessibilityAction'];
}

const getPriceChangeColor = (priceChange: number): TextColor => {
  if (priceChange === 0) {
    return TextColor.TextAlternative;
  }
  return priceChange > 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
};

const getPriceChangeDisplay = (
  price: TrendingAsset['price'],
  rawPriceChange: string | number | null | undefined,
): { subvalue: string | undefined; color: TextColor } => {
  if (Number(price) === 0) {
    return { subvalue: '—', color: TextColor.TextAlternative };
  }

  if (rawPriceChange == null || rawPriceChange === '') {
    return { subvalue: undefined, color: TextColor.TextAlternative };
  }

  const priceChange = Number(rawPriceChange);
  if (!Number.isFinite(priceChange)) {
    return { subvalue: undefined, color: TextColor.TextAlternative };
  }

  let sign = '';
  if (priceChange > 0) {
    sign = '+';
  } else if (priceChange < 0) {
    sign = '-';
  }

  return {
    subvalue: `${sign}${Math.abs(priceChange).toFixed(2)}%`,
    color: getPriceChangeColor(priceChange),
  };
};

const WatchlistTokenRowItem = ({
  token,
  position,
  onPress,
  onLongPress,
  onAddPress,
  onWatchlistPress,
  isWatchlisted = false,
  showTypeTag = false,
  tokenDetailsSource = TokenDetailsSource.WatchlistFullscreen,
  twClassName,
  accessibilityActions,
  onAccessibilityAction,
}: WatchlistTokenRowItemProps): React.JSX.Element => {
  const currentCurrency = useSelector(selectCurrentCurrency) ?? 'usd';
  const { onPress: defaultOnPress } = useTrendingTokenPress({
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

  const { subvalue, color: subvalueColor } = getPriceChangeDisplay(
    token.price,
    token.priceChangePct?.h24,
  );
  const hasStarAction = Boolean(onAddPress ?? onWatchlistPress);

  const handlePress = useCallback((): void => {
    if (onPress) {
      onPress(token);
      return;
    }
    defaultOnPress().catch(() => undefined);
  }, [defaultOnPress, onPress, token]);

  return (
    <ListItem
      isInteractive
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      testID={getTrendingTokenRowItemTestId(token.assetId)}
      avatar={
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            <BadgeNetwork src={networkBadgeImageSource} className="h-5 w-5" />
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
      titleProps={{
        numberOfLines: 1,
        // eslint-disable-next-line react-native/no-inline-styles
        style: { flexShrink: 1 },
      }}
      titleEndAccessory={
        showTypeTag ? (
          <Tag severity={TagSeverity.Neutral} className="self-center">
            {strings('token_watchlist.token_tag')}
          </Tag>
        ) : undefined
      }
      description={`${token.symbol} • ${formatMarketStats(
        token.marketCap ?? 0,
        token.aggregatedUsdVolume ?? 0,
        currentCurrency,
      )}`}
      descriptionProps={{
        numberOfLines: 1,
        ellipsizeMode: 'tail',
        // Ensure the description yields to the price column before it can
        // render beneath it on narrow watchlist rows.
        // eslint-disable-next-line react-native/no-inline-styles
        style: { flex: 1, minWidth: 0, flexShrink: 1 },
      }}
      value={formatPriceWithSubscriptNotation(token.price, currentCurrency)}
      subvalue={subvalue}
      subvalueProps={{ color: subvalueColor }}
      endAccessory={
        hasStarAction ? (
          <ButtonIcon
            iconName={isWatchlisted ? IconName.StarFilled : IconName.Star}
            size={ButtonIconSize.Md}
            onPress={onWatchlistPress ?? onAddPress}
            accessibilityLabel={strings(
              isWatchlisted
                ? 'token_watchlist.remove_from_watchlist'
                : 'token_watchlist.add_to_watchlist',
            )}
            testID={getTrendingTokenRowAddButtonTestId(token.assetId)}
          />
        ) : undefined
      }
      accessoryGap={hasStarAction ? 3 : undefined}
      className={['py-2 min-h-0', twClassName].filter(Boolean).join(' ')}
    /><BadgeWrapper
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
      titleProps={{
        numberOfLines: 1,
        // eslint-disable-next-line react-native/no-inline-styles
        style: { flexShrink: 1 },
      }}
      titleEndAccessory={
        showTypeTag ? (
          <Tag severity={TagSeverity.Neutral} className="self-center">
            {strings('token_watchlist.token_tag')}
          </Tag>
        ) : undefined
      }
      description={`${token.symbol} • ${formatMarketStats(
        token.marketCap ?? 0,
        token.aggregatedUsdVolume ?? 0,
        currentCurrency,
      )}`}
      descriptionProps={{
        numberOfLines: 1,
        ellipsizeMode: 'tail',
        // Ensure the description yields to the price column before it can
        // render beneath it on narrow watchlist rows.
        // eslint-disable-next-line react-native/no-inline-styles
        style: { flex: 1, minWidth: 0, flexShrink: 1 },
      }}
      value={formatPriceWithSubscriptNotation(token.price, currentCurrency)}
      subvalue={subvalue}
      subvalueProps={{ color: subvalueColor }}
      endAccessory={
        hasStarAction ? (
          <ButtonIcon
            iconName={isWatchlisted ? IconName.StarFilled : IconName.Star}
            size={ButtonIconSize.Md}
            onPress={onWatchlistPress ?? onAddPress}
            accessibilityLabel={strings(
              isWatchlisted
                ? 'token_watchlist.remove_from_watchlist'
                : 'token_watchlist.add_to_watchlist',
            )}
            testID={getTrendingTokenRowAddButtonTestId(token.assetId)}
          />
        ) : undefined
      }
      accessoryGap={hasStarAction ? 3 : undefined}
      twClassName={['py-2 min-h-0', twClassName].filter(Boolean).join(' ')}
    />
  );
};

export default React.memo(WatchlistTokenRowItem);
