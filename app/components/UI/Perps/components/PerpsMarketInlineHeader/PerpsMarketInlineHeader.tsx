import React, { type ReactNode, useMemo } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  HeaderSubpage,
  IconName,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_COLLATERAL_SYMBOL } from '../../constants/perpsConfig';
import { PerpsMarketHeaderSelectorsIDs } from '../../Perps.testIds';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsMarketIdentity from '../PerpsMarketIdentity';
import PerpsTokenLogo from '../PerpsTokenLogo';

export interface PerpsMarketInlineHeaderProps {
  market: PerpsMarketData;
  /** Current price from candle stream - syncs header with chart */
  currentPrice: number;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  endAccessory?: ReactNode;
  /**
   * When true, renders the redesigned market-detail layout instead of the
   * compact one: title becomes the full asset name, a leverage pill is added
   * on the first row, the description becomes the static
   * `[Ticker]-[collateral] perp` pair on the second row, and the live
   * price/24h change are removed from the header (relocated below by the
   * parent). When false, the compact layout (pair title + live price) renders.
   */
  useDetailLayout?: boolean;
  /**
   * Detail layout only. When provided, the market identity (icon + name +
   * ticker + leverage) becomes a tightly-bounded pressable box that hugs its
   * content — pressing it fires this callback and shows a button-like pressed
   * background. The surrounding header row stays non-interactive.
   */
  onIdentityPress?: () => void;
}

export const PerpsMarketInlineHeader = ({
  market,
  currentPrice,
  onBackPress,
  onMorePress,
  onFavoritePress,
  isFavorite = false,
  testID,
  endAccessory,
  useDetailLayout = false,
  onIdentityPress,
}: PerpsMarketInlineHeaderProps) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);

  const displayTitle = useDetailLayout
    ? market.name || displaySymbol
    : `${displaySymbol}-${PERPS_COLLATERAL_SYMBOL}`;

  const leverageBadge = useMemo(
    () =>
      market.maxLeverage ? (
        <PerpsLeverage maxLeverage={market.maxLeverage} />
      ) : null,
    [market.maxLeverage],
  );

  const detailIdentity = useMemo(() => {
    if (!useDetailLayout) {
      return null;
    }

    return (
      <PerpsMarketIdentity
        symbol={market.symbol}
        name={market.name}
        maxLeverage={market.maxLeverage}
        size={40}
        gap={3}
        onPress={onIdentityPress}
        testIDs={{
          assetIcon: PerpsMarketHeaderSelectorsIDs.ASSET_ICON,
          assetName: PerpsMarketHeaderSelectorsIDs.ASSET_NAME,
          subtitle: PerpsMarketHeaderSelectorsIDs.SUBTITLE,
          marketListButton: PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON,
        }}
      />
    );
  }, [
    useDetailLayout,
    market.symbol,
    market.name,
    market.maxLeverage,
    onIdentityPress,
  ]);

  const compactDescription = useMemo(
    () => (
      <LivePriceHeader
        symbol={market.symbol}
        testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
        testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
        currentPrice={currentPrice}
      />
    ),
    [market.symbol, currentPrice],
  );

  const endButtonIconProps = useMemo(() => {
    const buttons = [];

    if (onFavoritePress) {
      buttons.push({
        iconName: isFavorite ? IconName.StarFilled : IconName.Star,
        onPress: onFavoritePress,
        testID: PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
        accessibilityLabel: strings(
          isFavorite
            ? 'perps.market_details.remove_from_watchlist'
            : 'perps.market_details.add_to_watchlist',
        ),
      });
    } else if (onMorePress) {
      buttons.push({
        iconName: IconName.MoreVertical,
        onPress: onMorePress,
        testID: PerpsMarketHeaderSelectorsIDs.MORE_BUTTON,
      });
    }

    return buttons.length > 0 ? buttons : undefined;
  }, [onFavoritePress, isFavorite, onMorePress]);

  return (
    <HeaderSubpage
      includesTopInset
      twClassName="min-h-14 h-auto bg-default justify-center"
      testID={testID}
      startAccessory={
        onBackPress ? (
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={onBackPress}
            accessibilityLabel={strings('perps.market_details.back')}
            testID={PerpsMarketHeaderSelectorsIDs.BACK_BUTTON}
          />
        ) : undefined
      }
      endAccessory={endAccessory}
      endButtonIconProps={endAccessory ? undefined : endButtonIconProps}
      avatar={
        useDetailLayout ? (
          detailIdentity
        ) : (
          <PerpsTokenLogo
            symbol={market.symbol}
            size={40}
            testID={PerpsMarketHeaderSelectorsIDs.ASSET_ICON}
          />
        )
      }
      title={useDetailLayout ? undefined : displayTitle}
      titleProps={
        useDetailLayout
          ? undefined
          : { testID: PerpsMarketHeaderSelectorsIDs.ASSET_NAME }
      }
      titleEndAccessory={useDetailLayout ? undefined : leverageBadge}
      description={useDetailLayout ? undefined : compactDescription}
    />
  );
};

export default PerpsMarketInlineHeader;
