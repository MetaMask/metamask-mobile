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
}: PerpsMarketInlineHeaderProps) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);
  const displayTitle = `${displaySymbol}-${PERPS_COLLATERAL_SYMBOL}`;

  const leverageBadge = useMemo(
    () =>
      market.maxLeverage ? (
        <PerpsLeverage maxLeverage={market.maxLeverage} />
      ) : null,
    [market.maxLeverage],
  );

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
        <PerpsTokenLogo
          symbol={market.symbol}
          size={40}
          testID={PerpsMarketHeaderSelectorsIDs.ASSET_ICON}
        />
      }
      title={displayTitle}
      titleProps={{ testID: PerpsMarketHeaderSelectorsIDs.ASSET_NAME }}
      titleEndAccessory={leverageBadge}
      description={compactDescription}
    />
  );
};

export default PerpsMarketInlineHeader;
