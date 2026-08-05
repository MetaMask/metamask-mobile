import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- shared Perps stream provider (UI layer, not a route)
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { useTradablePerpsMarketSymbols } from '../../../../UI/WhatsHappening/hooks';
import { getSupportedXyzPerpMarketSymbol } from '../../utils/perp';

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
  // We only support trading `xyz` HIP-3 markets. `xyz`/non-HIP-3 symbols link
  // directly; other HIP-3 providers (e.g. `cash:SPCX`) are remapped to their
  // `xyz` equivalent (`xyz:SPCX`) and are only tradable when that market exists.
  const { tradableSymbols } = useTradablePerpsMarketSymbols();

  const { targetSymbol, isSupported } = useMemo(() => {
    const resolved = getSupportedXyzPerpMarketSymbol(symbol);
    // An empty set means the market list hasn't arrived yet (per the hook's
    // contract) — not that no markets are tradable. `usePerpsMarkets` can
    // report `isLoading: false` with an empty list while a fetch is still in
    // flight (or when an empty controller cache is treated as preloaded), so
    // we key off the set being empty rather than the loading flag to avoid a
    // false, sticky "Unsupported market". The perps list is never legitimately
    // empty (BTC/ETH always present), so an empty set reliably means "unknown".
    return {
      targetSymbol: resolved.targetSymbol,
      isSupported:
        !resolved.requiresXyzMarketCheck ||
        tradableSymbols.size === 0 ||
        tradableSymbols.has(resolved.targetSymbol),
    };
  }, [symbol, tradableSymbols]);

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
