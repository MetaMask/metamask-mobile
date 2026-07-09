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
   * When true, renders the redesigned market-detail identity:
   * full asset name + leverage pill + market-list arrow on the first row and
   * the `[Ticker]-[collateral] perp` pair on the second row. Price/24h change
   * are expected to be rendered below the header by the parent.
   */
  showAssetName?: boolean;
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
  showAssetName = false,
}: PerpsMarketInlineHeaderProps) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);

  const displayTitle = showAssetName
    ? market.name || displaySymbol
    : `${displaySymbol}-${PERPS_COLLATERAL_SYMBOL}`;

  const titleEndAccessory = useMemo(() => {
    const hasLeverage = Boolean(market.maxLeverage);

    // The market-list arrow is only relevant in the redesigned layout.
    const showMarketListButton = showAssetName && Boolean(onMarketListPress);

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
  }, [market.maxLeverage, showAssetName, onMarketListPress]);

  const description = useMemo(() => {
    // Redesigned layout shows the market pair as a static subtitle. Price and
    // 24h change move below the header (rendered by the parent view).
    if (showAssetName) {
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
  }, [showAssetName, displaySymbol, market.symbol, currentPrice]);

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
        showAssetName
          ? { testID: PerpsMarketHeaderSelectorsIDs.SUBTITLE }
          : undefined
      }
    />
  );
};

export default PerpsMarketInlineHeader;
