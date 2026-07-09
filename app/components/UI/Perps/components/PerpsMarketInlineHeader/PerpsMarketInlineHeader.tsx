import React, { type ReactNode, useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import PerpsTokenLogo from '../PerpsTokenLogo';

export interface PerpsMarketInlineHeaderProps {
  market: PerpsMarketData;
  /** Current price from candle stream - syncs header with chart */
  currentPrice: number;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  /** Opens the market list from the arrow next to the market name. */
  onMarketListPress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  endAccessory?: ReactNode;
  /**
   * When true, renders the redesigned market-detail layout instead of the
   * compact one: title becomes the full asset name, a leverage pill +
   * market-list arrow are added on the first row, the description becomes the
   * static `[Ticker]-[collateral] perp` pair on the second row, and the live
   * price/24h change are removed from the header (relocated below by the
   * parent). When false, the compact layout (pair title + live price) renders.
   */
  useDetailLayout?: boolean;
}

export const PerpsMarketInlineHeader = ({
  market,
  currentPrice,
  onBackPress,
  onMorePress,
  onFavoritePress,
  onMarketListPress,
  isFavorite = false,
  testID,
  endAccessory,
  useDetailLayout = false,
}: PerpsMarketInlineHeaderProps) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);

  const displayTitle = useDetailLayout
    ? market.name || displaySymbol
    : `${displaySymbol}-${PERPS_COLLATERAL_SYMBOL}`;

  const titleEndAccessory = useMemo(() => {
    const hasLeverage = Boolean(market.maxLeverage);

    // The market-list arrow is only relevant in the redesigned layout.
    const showMarketListButton = useDetailLayout && Boolean(onMarketListPress);

    if (!hasLeverage && !showMarketListButton) {
      return undefined;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        {hasLeverage ? (
          <PerpsLeverage maxLeverage={market.maxLeverage} />
        ) : null}
        {showMarketListButton ? (
          <ButtonIcon
            iconName={IconName.ArrowDown}
            size={ButtonIconSize.Sm}
            onPress={onMarketListPress}
            testID={PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON}
            accessibilityLabel={strings('perps.market_details.market_list')}
          />
        ) : null}
      </Box>
    );
  }, [market.maxLeverage, useDetailLayout, onMarketListPress]);

  const description = useMemo(() => {
    // Redesigned layout shows the market pair as a static subtitle. Price and
    // 24h change move below the header (rendered by the parent view).
    if (useDetailLayout) {
      return strings('perps.market_details.perp_pair', {
        ticker: displaySymbol,
        collateral: PERPS_COLLATERAL_SYMBOL,
      });
    }

    return (
      <LivePriceHeader
        symbol={market.symbol}
        testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
        testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
        currentPrice={currentPrice}
      />
    );
  }, [useDetailLayout, displaySymbol, market.symbol, currentPrice]);

  const endButtonIconProps = useMemo(() => {
    const buttons = [];

    if (onFavoritePress) {
      buttons.push({
        iconName: isFavorite ? IconName.StarFilled : IconName.Star,
        onPress: onFavoritePress,
        testID: PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
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
            testID={PerpsMarketHeaderSelectorsIDs.BACK_BUTTON}
          />
        ) : undefined
      }
      endAccessory={endAccessory}
      endButtonIconProps={endAccessory ? undefined : endButtonIconProps}
      avatar={
        <PerpsTokenLogo
          symbol={market.symbol}
          size={40}
          testID={PerpsMarketHeaderSelectorsIDs.ASSET_ICON}
        />
      }
      title={displayTitle}
      titleProps={{ testID: PerpsMarketHeaderSelectorsIDs.ASSET_NAME }}
      titleEndAccessory={titleEndAccessory}
      description={description}
      descriptionProps={
        useDetailLayout
          ? { testID: PerpsMarketHeaderSelectorsIDs.SUBTITLE }
          : undefined
      }
    />
  );
};

export default PerpsMarketInlineHeader;
