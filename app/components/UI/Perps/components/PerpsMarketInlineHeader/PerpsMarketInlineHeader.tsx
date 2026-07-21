import React, { type ReactNode, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  HeaderSubpage,
  IconName,
  Text,
  TextColor,
  TextVariant,
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

  // Detail layout: the icon + name + ticker + leverage are rendered together
  // inside a single content-hugging box so they can act as one tap target
  // without the empty row space becoming clickable.
  const detailIdentity = useMemo(() => {
    if (!useDetailLayout) {
      return null;
    }

    const subtitle = strings('perps.market_details.perp_pair', {
      ticker: displaySymbol,
      collateral: PERPS_COLLATERAL_SYMBOL,
    });

    const renderContent = (pressed: boolean) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName={`rounded-lg p-1 ${pressed ? 'bg-pressed' : ''}`}
      >
        <PerpsTokenLogo
          symbol={market.symbol}
          size={40}
          testID={PerpsMarketHeaderSelectorsIDs.ASSET_ICON}
        />
        <Box flexDirection={BoxFlexDirection.Column}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              testID={PerpsMarketHeaderSelectorsIDs.ASSET_NAME}
            >
              {displayTitle}
            </Text>
            {leverageBadge}
          </Box>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID={PerpsMarketHeaderSelectorsIDs.SUBTITLE}
          >
            {subtitle}
          </Text>
        </Box>
      </Box>
    );

    if (!onIdentityPress) {
      return renderContent(false);
    }

    return (
      <Pressable
        onPress={onIdentityPress}
        accessibilityRole="button"
        accessibilityLabel={strings('perps.market_details.market_list')}
        testID={PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON}
      >
        {({ pressed }) => renderContent(pressed)}
      </Pressable>
    );
  }, [
    useDetailLayout,
    displaySymbol,
    displayTitle,
    leverageBadge,
    market.symbol,
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
