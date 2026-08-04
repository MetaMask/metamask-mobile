import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- shared Perps stream provider (UI layer, not a route)
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { usePerpMarketNavigationTarget } from '../hooks/usePerpMarketNavigationTarget';

export interface TraderPositionHeaderTokenLinkProps {
  /** Raw perp market symbol from the position (may carry a HIP-3 prefix). */
  symbol: string;
  /** Display symbol shown in the header. */
  display: string;
  /**
   * Called with the resolved `xyz` market symbol the user should be taken to.
   * Only fires when the asset is supported.
   */
  onTrade: (targetSymbol: string) => void;
  /** testID for the symbol Text (kept stable across supported/unsupported). */
  testID: string;
  /** testID for the Pressable wrapper (present only when supported). */
  linkTestID: string;
}

const styles = StyleSheet.create({
  pressablePressed: {
    opacity: 0.7,
  },
});

const symbolText = (display: string, testID: string) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Bold}
    color={TextColor.TextDefault}
    numberOfLines={1}
    twClassName="shrink"
    testID={testID}
  >
    {display}
  </Text>
);

const TraderPositionHeaderTokenLinkInner: React.FC<
  TraderPositionHeaderTokenLinkProps
> = ({ symbol, display, onTrade, testID, linkTestID }) => {
  const { targetSymbol, isSupported } = usePerpMarketNavigationTarget(symbol);

  const handlePress = useCallback(() => {
    if (!isSupported) return;
    onTrade(targetSymbol);
  }, [isSupported, onTrade, targetSymbol]);

  // Mirror the disabled Trade CTA — never link to an unsupported market.
  if (!isSupported) {
    return symbolText(display, testID);
  }

  return (
    <Pressable
      onPress={handlePress}
      testID={linkTestID}
      accessibilityRole="button"
      accessibilityLabel={strings(
        'social_leaderboard.trader_position.view_market',
        { symbol: display },
      )}
      style={({ pressed }) => (pressed ? styles.pressablePressed : undefined)}
    >
      {symbolText(display, testID)}
    </Pressable>
  );
};

/**
 * Tappable token symbol for the compact perp header. Resolves the position's
 * symbol to the `xyz` HIP-3 market we support and either links to it (same
 * navigation as the Trade CTA) or renders a plain, non-interactive symbol for
 * unsupported markets.
 *
 * Wrapped in its own {@link PerpsStreamProvider} — the market-data
 * subscription that backs the existence check is scoped to perp positions only,
 * mirroring {@link PerpsTradeButton}.
 */
const TraderPositionHeaderTokenLink: React.FC<
  TraderPositionHeaderTokenLinkProps
> = (props) => (
  <PerpsStreamProvider>
    <TraderPositionHeaderTokenLinkInner {...props} />
  </PerpsStreamProvider>
);

export default TraderPositionHeaderTokenLink;
