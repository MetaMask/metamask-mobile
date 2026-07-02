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
  onFullscreenPress?: () => void;
  onCategorySearchPress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  fullscreenButtonTestID?: string;
  endAccessory?: ReactNode;
}

export const PerpsMarketInlineHeader = ({
  market,
  currentPrice,
  onBackPress,
  onMorePress,
  onFavoritePress,
  onFullscreenPress,
  onCategorySearchPress,
  isFavorite = false,
  testID,
  fullscreenButtonTestID,
  endAccessory,
}: PerpsMarketInlineHeaderProps) => {
  const displayTitle = `${getPerpsDisplaySymbol(market.symbol)}-USD`;

  const titleEndAccessory = useMemo(() => {
    if (!market.maxLeverage) {
      return undefined;
    }

    return <PerpsLeverage maxLeverage={market.maxLeverage} />;
  }, [market.maxLeverage]);

  const description = useMemo(
    () => (
      <LivePriceHeader
        symbol={market.symbol}
        testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
        testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
        throttleMs={1000}
        currentPrice={currentPrice}
      />
    ),
    [market.symbol, currentPrice],
  );

  const endButtonIconProps = useMemo(() => {
    const buttons = [];

    if (onFullscreenPress) {
      buttons.push({
        iconName: IconName.Expand,
        onPress: onFullscreenPress,
        testID:
          fullscreenButtonTestID ??
          `${testID ?? 'perps-market-header'}-fullscreen-button`,
        accessibilityLabel: strings('perps.market_details.fullscreen_chart'),
      });
    }

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

    if (onCategorySearchPress) {
      buttons.push({
        iconName: IconName.Search,
        onPress: onCategorySearchPress,
        testID: PerpsMarketHeaderSelectorsIDs.CATEGORY_SEARCH_BUTTON,
        accessibilityLabel: strings('perps.market_details.category_search'),
      });
    }

    return buttons.length > 0 ? buttons : undefined;
  }, [
    onFullscreenPress,
    fullscreenButtonTestID,
    testID,
    onFavoritePress,
    isFavorite,
    onMorePress,
    onCategorySearchPress,
  ]);

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
    />
  );
};

export default PerpsMarketInlineHeader;
