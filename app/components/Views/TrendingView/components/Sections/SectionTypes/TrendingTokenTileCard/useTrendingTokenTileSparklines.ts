import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { isCaipChainId, type CaipAssetType } from '@metamask/utils';
import { selectCurrentCurrency } from '../../../../../../../selectors/currencyRateController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainHistoricalPrices } from '../../../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { selectLastSelectedSolanaAccount } from '../../../../../../../selectors/accountsController';
import Engine from '../../../../../../../core/Engine';
import { TraceName, endTrace, trace } from '../../../../../../../util/trace';
import type { TokenPrice } from '../../../../../../../components/hooks/useTokenHistoricalPrices';
import { downsample } from '../../../../../../../util/sparklines';

const SPARKLINE_TARGET_POINTS = 50;
const PRICE_API_BASE = 'https://price.api.cx.metamask.io/v3';
const SPARKLINE_INTERVAL = 'P1D';

/**
 * EVM-only: build historical price URL (same contract as `useTokenHistoricalPrices`).
 */
function buildEvmHistoricalPriceUrl(
  token: TrendingAsset,
  vsCurrency: string,
): string | null {
  const [caipChain, assetRef] = token.assetId.split('/');
  if (!caipChain || !assetRef) return null;
  if (!isCaipChainId(caipChain) || !caipChain.startsWith('eip155:'))
    return null;
  const uri = new URL(
    `${PRICE_API_BASE}/historical-prices/${caipChain}/${assetRef}`,
  );
  uri.searchParams.set('timePeriod', '1d');
  uri.searchParams.set('vsCurrency', vsCurrency);
  return uri.toString();
}

/**
 * Batched 1d price history for trending tokens (parallel fetches).
 * EVM tokens are fetched directly; non-EVM tokens use MultichainAssetsRatesController.
 */
export function useTrendingTokenTileSparklines(tokens: TrendingAsset[]): {
  sparklines: Record<string, number[]>;
  refresh: () => void;
} {
  const vsCurrency = useSelector(selectCurrentCurrency);
  const lastSelectedNonEvmAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainHistoricalPrices = useSelector(
    selectMultichainHistoricalPrices,
  );
  ///: END:ONLY_INCLUDE_IF

  const [evmSparklines, setEvmSparklines] = useState<Record<string, number[]>>(
    {},
  );
  const dataRef = useRef<Record<string, number[]>>({});
  const flushScheduledRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Ref holds the latest tokens so the effect can read them without being
  // re-triggered when the upstream array reference changes but the IDs haven't.
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  // Stable string key — effect only re-runs when the actual token IDs change.
  const assetsKey = useMemo(
    () => tokens.map((t) => t.assetId).join('\u0001'),
    [tokens],
  );

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    queueMicrotask(() => {
      flushScheduledRef.current = false;
      setEvmSparklines({ ...dataRef.current });
    });
  }, []);

  useEffect(() => {
    if (!assetsKey) {
      dataRef.current = {};
      setEvmSparklines({});
      return undefined;
    }

    dataRef.current = {};
    setEvmSparklines({});

    const currentTokens = tokensRef.current;

    // EVM: direct HTTP fetch → local state
    const fetchOneEvm = async (token: TrendingAsset) => {
      const id = token.assetId;
      const url = buildEvmHistoricalPriceUrl(token, vsCurrency);
      if (!url) return;
      dataRef.current[id] = []; // empty array = fetch in progress (placeholder for loading shimmer)
      scheduleFlush();
      try {
        trace({ name: TraceName.FetchHistoricalPrices, data: { uri: url } });
        const response = await fetch(url);
        endTrace({ name: TraceName.FetchHistoricalPrices });
        if (response.status === 204) return;
        const body: { prices: TokenPrice[] } = await response.json();
        const closes = (body.prices ?? []).map((p) => p[1]);
        if (closes.length < 2) return;
        dataRef.current[id] = downsample(closes, SPARKLINE_TARGET_POINTS);
        scheduleFlush();
      } catch {
        // omit failed series
      }
    };

    Promise.all(
      currentTokens
        .filter((t) => t.assetId.startsWith('eip155:'))
        .map(fetchOneEvm),
    ).catch(() => undefined);

    // Non-EVM: delegate to MultichainAssetsRatesController → results land in Redux
    for (const token of currentTokens.filter(
      (t) => !t.assetId.startsWith('eip155:'),
    )) {
      Engine.context.MultichainAssetsRatesController.fetchHistoricalPricesForAsset(
        token.assetId as CaipAssetType,
        lastSelectedNonEvmAccount,
      ).catch(() => {
        // omit failed series
      });
    }

    return () => {
      dataRef.current = {};
    };
  }, [
    assetsKey,
    scheduleFlush,
    vsCurrency,
    lastSelectedNonEvmAccount,
    refreshKey,
  ]);

  // Non-EVM sparklines: derived reactively from Redux state after controller fetch
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const nonEvmSparklines = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const token of tokens) {
      if (token.assetId.startsWith('eip155:')) continue;
      const historicalForAsset =
        multichainHistoricalPrices?.[
          token.assetId as keyof typeof multichainHistoricalPrices
        ];
      const prices =
        historicalForAsset?.[vsCurrency]?.intervals?.[SPARKLINE_INTERVAL];
      if (prices && prices.length >= 2) {
        result[token.assetId] = downsample(
          prices.map((point) => Number(point[1])),
          SPARKLINE_TARGET_POINTS,
        );
      }
    }
    return result;
  }, [tokens, multichainHistoricalPrices, vsCurrency]);
  ///: END:ONLY_INCLUDE_IF

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    sparklines: {
      ...evmSparklines,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      ...nonEvmSparklines,
      ///: END:ONLY_INCLUDE_IF
    },
    refresh,
  };
}
