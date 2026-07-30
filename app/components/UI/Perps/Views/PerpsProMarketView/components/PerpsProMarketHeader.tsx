import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { PerpsMode, type PerpsMarketData } from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsMarketIdentity from '../../../components/PerpsMarketIdentity';
import PerpsModeToggle from '../../../components/PerpsModeToggle';

interface PerpsProMarketHeaderProps {
  /**
   * Market payload from route params. After the parent has verified
   * `symbol`, remaining fields may still be partial (deep-link entries).
   */
  market: Partial<PerpsMarketData> & { symbol: string };
  /**
   * Active Perps mode for the read-only mode pill. Required when
   * `onModeChange` is provided; ignored otherwise.
   */
  mode?: PerpsMode;
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
  // Matches the Figma title cap so long names truncate instead of pushing the
  // leverage tag / caret out of view.
  nameText: {
    maxWidth: 120,
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
}: PerpsProMarketHeaderProps) => (
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
        accessibilityLabel={strings('perps.market_details.back')}
        testID={PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON}
      />
    ) : null}

    <Box twClassName="flex-1">
      <PerpsMarketIdentity
        symbol={market.symbol}
        name={market.name}
        maxLeverage={market.maxLeverage}
        size={32}
        gap={2}
        nameStyle={styles.nameText}
        onPress={onIdentityPress}
        testIDs={{
          assetIcon: PerpsProMarketViewSelectorsIDs.HEADER_ASSET_ICON,
          assetName: PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL,
          subtitle: PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE,
          marketListButton:
            PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON,
        }}
      />
    </Box>

    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      {onWalletPress ? (
        <ButtonIcon
          iconName={IconName.Wallet}
          size={ButtonIconSize.Md}
          onPress={onWalletPress}
          accessibilityLabel={strings('perps.market_details.wallet')}
          testID={PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON}
        />
      ) : null}
      {onFavoritePress ? (
        <ButtonIcon
          iconName={isFavorite ? IconName.StarFilled : IconName.Star}
          size={ButtonIconSize.Md}
          onPress={onFavoritePress}
          accessibilityLabel={strings(
            isFavorite
              ? 'perps.market_details.remove_from_watchlist'
              : 'perps.market_details.add_to_watchlist',
          )}
          testID={PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON}
        />
      ) : null}
      {onModeChange && mode ? (
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

export default PerpsProMarketHeader;
