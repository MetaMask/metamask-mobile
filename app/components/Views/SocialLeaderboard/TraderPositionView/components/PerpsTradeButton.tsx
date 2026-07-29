import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- shared Perps stream provider (UI layer, not a route)
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { usePerpMarketNavigationTarget } from '../hooks/usePerpMarketNavigationTarget';

export interface PerpsTradeButtonProps {
  /** Raw perp market symbol from the position (may carry a HIP-3 prefix). */
  symbol: string;
  /**
   * Called with the resolved `xyz` market symbol the user should be taken to.
   * Only fires when the asset is supported.
   */
  onTrade: (targetSymbol: string) => void;
  testID?: string;
}

const PerpsTradeButtonInner: React.FC<PerpsTradeButtonProps> = ({
  symbol,
  onTrade,
  testID,
}) => {
  // The `xyz`/HIP-3 resolution + existence check lives in the shared hook so
  // the Trade CTA and the header token link resolve the target symbol
  // identically from one source of truth.
  const { targetSymbol, isSupported } = usePerpMarketNavigationTarget(symbol);

  const handlePress = useCallback(() => {
    if (!isSupported) return;
    onTrade(targetSymbol);
  }, [isSupported, onTrade, targetSymbol]);

  return (
    <Box twClassName="px-4 py-3">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={!isSupported}
        onPress={handlePress}
        testID={testID}
      >
        {isSupported
          ? strings('social_leaderboard.trader_position.trade')
          : strings('social_leaderboard.trader_position.unsupported_market')}
      </Button>
    </Box>
  );
};

/**
 * Trade CTA for a perp position. Resolves the position's symbol to the `xyz`
 * HIP-3 market we support and either links to it or disables itself as an
 * unsupported asset.
 *
 * Wrapped in its own {@link PerpsStreamProvider} so the market-data
 * subscription that backs the existence check is scoped to perp positions
 * only — spot positions never mount it. The provider merely shares the
 * app-wide stream singleton (no connection side effects of its own); the only
 * effect is subscribing to the public market-data channel, which the homepage
 * already warms.
 */
const PerpsTradeButton: React.FC<PerpsTradeButtonProps> = (props) => (
  <PerpsStreamProvider>
    <PerpsTradeButtonInner {...props} />
  </PerpsStreamProvider>
);

export default PerpsTradeButton;
