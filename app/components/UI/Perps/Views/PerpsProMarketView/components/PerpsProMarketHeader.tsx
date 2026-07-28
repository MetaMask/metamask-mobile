import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  PerpsMode,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PERPS_COLLATERAL_SYMBOL } from '../../../constants/perpsConfig';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsLeverage from '../../../components/PerpsLeverage/PerpsLeverage';
import PerpsModeToggle from '../../../components/PerpsModeToggle';
import PerpsTokenLogo from '../../../components/PerpsTokenLogo';

interface PerpsProMarketHeaderProps {
  market: PerpsMarketData;
  /** Active Perps mode — drives the read-only mode pill on the right. */
  mode: PerpsMode;
  onBackPress?: () => void;
  /**
   * When provided, the asset identity (icon + name + leverage) becomes a tap
   * target that opens the market list, and a trailing caret is shown.
   */
  onIdentityPress?: () => void;
  onWalletPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  onModeChange?: (mode: PerpsMode) => void;
}

const styles = StyleSheet.create({
  container: {
    height: 64,
  },
});

/**
 * Fixed Pro-mode market header.
 *
 * Left: back button. Center: tappable asset identity (token icon, name,
 * leverage pill, market-list caret, and `[Ticker]-[collateral] perp`
 * subtitle). Right: wallet, favorite (watchlist star), and the read-only
 * Lite/Pro mode pill.
 */
const PerpsProMarketHeader = ({
  market,
  mode,
  onBackPress,
  onIdentityPress,
  onWalletPress,
  onFavoritePress,
  isFavorite = false,
  onModeChange,
}: PerpsProMarketHeaderProps) => {
  const displaySymbol = getPerpsDisplaySymbol(market.symbol);
  const displayTitle = market.name || displaySymbol;
  const subtitle = strings('perps.market_details.perp_pair', {
    ticker: displaySymbol,
    collateral: PERPS_COLLATERAL_SYMBOL,
  });

  const renderIdentity = (pressed: boolean) => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName={`min-w-0 flex-1 rounded-lg p-1 ${pressed ? 'bg-pressed' : ''}`}
    >
      <PerpsTokenLogo
        symbol={market.symbol}
        size={32}
        testID={PerpsProMarketViewSelectorsIDs.HEADER_ASSET_ICON}
      />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="min-w-0 flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            twClassName="shrink"
            testID={PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL}
          >
            {displayTitle}
          </Text>
          {market.maxLeverage ? (
            <PerpsLeverage maxLeverage={market.maxLeverage} />
          ) : null}
          {onIdentityPress ? (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Xs}
              color={IconColor.IconAlternative}
            />
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE}
        >
          {subtitle}
        </Text>
      </Box>
    </Box>
  );

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.HEADER}
      style={styles.container}
      twClassName="border-b border-muted bg-default px-4"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
    >
      {onBackPress ? (
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBackPress}
          testID={PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON}
        />
      ) : null}

      <Box twClassName="min-w-0 flex-1">
        {onIdentityPress ? (
          <Pressable
            onPress={onIdentityPress}
            accessibilityRole="button"
            accessibilityLabel={strings('perps.market_details.market_list')}
            testID={PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON}
          >
            {({ pressed }) => renderIdentity(pressed)}
          </Pressable>
        ) : (
          renderIdentity(false)
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {onWalletPress ? (
          <ButtonIcon
            iconName={IconName.Wallet}
            size={ButtonIconSize.Md}
            onPress={onWalletPress}
            testID={PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON}
          />
        ) : null}
        {onFavoritePress ? (
          <ButtonIcon
            iconName={isFavorite ? IconName.StarFilled : IconName.Star}
            size={ButtonIconSize.Md}
            onPress={onFavoritePress}
            testID={PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON}
          />
        ) : null}
        {onModeChange ? (
          <PerpsModeToggle
            mode={mode}
            variant="active"
            onChange={onModeChange}
            source={PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default PerpsProMarketHeader;
