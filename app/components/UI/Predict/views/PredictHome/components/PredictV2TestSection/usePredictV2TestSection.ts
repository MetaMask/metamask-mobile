import { useCallback, useEffect, useState } from 'react';
import type { PredictMarket, PredictOutcomeToken } from '../../../../types';
import {
  getPolymarketEndpoints,
  parsePolymarketEvents,
} from '../../../../providers/polymarket/utils';
import type { PolymarketApiEvent } from '../../../../providers/polymarket/types';
import { isCryptoUpDown } from '../../../../utils/cryptoUpDown';
import DevLogger from '../../../../../../../core/SDKConnect/utils/DevLogger';

/**
 * Max cards shown on the v2 test section. Mirrors the trending section's cap.
 */
export const V2_TEST_DISPLAY_LIMIT = 5;

/**
 * Fetch cap. Deliberately large: v2 events with Gamma-visible volume are
 * outnumbered by freshly spawned Up/Down windows, so a small page can be
 * entirely Up/Down (which the section excludes).
 */
const V2_TEST_FETCH_LIMIT = 30;

/**
 * TEMPORARY (Protocol V2 testing): slug fragment identifying the 5m crypto
 * Up/Down windows. They are excluded from the regular list (they have their
 * own home UI), but the most liquid one is always surfaced in this section
 * so there is at least one tradeable v2 market to test against.
 */
const FIVE_MIN_UPDOWN_SLUG_FRAGMENT = 'updown-5m-';

/**
 * TEMPORARY (Protocol V2 testing): fetches the v2 listing directly from
 * Gamma's `/events` endpoint. The regular list pipeline reads
 * `/events/keyset?version=v2`, which currently 500s server-side (reported
 * to Polymarket), so this section reads the working non-keyset path until
 * that is fixed. The bearer token from `.js.env` is required while v2
 * markets are in private beta. Markets are parsed through the shared
 * `parsePolymarketEvents` — the regular pipeline, not a test parser.
 */
const fetchV2TestMarkets = async (): Promise<{
  markets: PredictMarket[];
  fiveMinConditionIds: string[];
}> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const token = process.env.MM_POLYMARKET_GAMMA_VISIBILITY_TOKEN;

  const response = await fetch(
    `${GAMMA_API_ENDPOINT}/events?closed=false&version=v2&limit=${V2_TEST_FETCH_LIMIT}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (!response.ok) {
    throw new Error(`GET /events ${response.status}`);
  }

  const events = (await response.json()) as PolymarketApiEvent[];
  const markets = parsePolymarketEvents(events, 'trending');

  // The 5m Up/Down windows are excluded from the regular list below, so
  // their condition ids are collected from the wire to surface the most
  // liquid one separately.
  const fiveMinConditionIds = events.flatMap((event) =>
    (event.markets ?? [])
      .filter((market) =>
        (market.slug ?? '').includes(FIVE_MIN_UPDOWN_SLUG_FRAGMENT),
      )
      .map((market) => market.conditionId),
  );

  DevLogger.log(
    '[Predict] v2 test fetch:',
    events.length,
    'events,',
    markets.length,
    'markets parsed',
  );

  return { markets, fiveMinConditionIds };
};

interface ClobBookOrder {
  price: string;
  size: string;
}

interface ClobBookSummary {
  asset_id: string;
  bids: ClobBookOrder[];
  asks: ClobBookOrder[];
}

/**
 * TEMPORARY (Protocol V2 testing): Gamma reports no liquidity/volume for v2
 * markets yet (fields are null and prices are 0.5 placeholders), so the only
 * real signal is the CLOB order book. Batched `POST /books` returns a book
 * per asset id.
 */
const fetchBooks = async (tokenIds: string[]): Promise<ClobBookSummary[]> => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  const response = await fetch(`${CLOB_ENDPOINT}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenIds.map((token_id) => ({ token_id }))),
  });

  if (!response.ok) {
    throw new Error(`POST /books ${response.status}`);
  }

  return (await response.json()) as ClobBookSummary[];
};

interface LiquidityFilterResult {
  /** Non-UpDown markets kept after the liquidity filter. */
  markets: PredictMarket[];
  /** Markets left after excluding crypto Up/Down. */
  candidates: number;
  /** Tokens found with a two-sided CLOB book. */
  liquidTokens: number;
  /** Most liquid 5m Up/Down market by total book depth, when quoted. */
  best5m: PredictMarket | null;
}

/**
 * TEMPORARY (Protocol V2 testing): keeps only events with at least one
 * outcome token backed by a two-sided CLOB book. Crypto Up/Down windows are
 * excluded entirely — they are market-maker quoted every few minutes, so they
 * dominate the volume ordering and would permanently crowd out every other
 * v2 event (they have their own home UI). The single most liquid 5m Up/Down
 * window (by total book depth) is returned separately so the section always
 * has one tradeable v2 market.
 */
const filterMarketsWithLiquidity = async (
  markets: PredictMarket[],
  fiveMinConditionIds: string[],
): Promise<LiquidityFilterResult> => {
  const candidates = markets.filter((market) => !isCryptoUpDown(market));
  const fiveMinMarkets = markets.filter((market) =>
    market.outcomes.some((outcome) => fiveMinConditionIds.includes(outcome.id)),
  );

  const tokenIds = [...candidates, ...fiveMinMarkets].flatMap((market) =>
    market.outcomes.flatMap((outcome): string[] =>
      outcome.tokens.map((token: PredictOutcomeToken) => token.id),
    ),
  );

  if (tokenIds.length === 0) {
    return {
      markets: candidates,
      candidates: candidates.length,
      liquidTokens: 0,
      best5m: null,
    };
  }

  const books = await fetchBooks(tokenIds);

  const depthByTokenId = new Map<string, number>();
  for (const book of books) {
    const depth =
      (book.bids ?? []).reduce((sum, order) => sum + Number(order.size), 0) +
      (book.asks ?? []).reduce((sum, order) => sum + Number(order.size), 0);
    depthByTokenId.set(book.asset_id, depth);
  }

  const liquidTokenIds = new Set(
    books
      .filter(
        (book) => (book.bids?.length ?? 0) > 0 && (book.asks?.length ?? 0) > 0,
      )
      .map((book) => book.asset_id),
  );

  DevLogger.log(
    '[Predict] v2 liquidity check:',
    tokenIds.length,
    'tokens checked,',
    liquidTokenIds.size,
    'with two-sided books',
  );

  const hasLiquidToken = (market: PredictMarket) =>
    market.outcomes.some((outcome) =>
      outcome.tokens.some((token) => liquidTokenIds.has(token.id)),
    );

  const totalBookDepth = (market: PredictMarket) =>
    market.outcomes.reduce(
      (sum, outcome) =>
        sum +
        outcome.tokens.reduce(
          (tokenSum, token) => tokenSum + (depthByTokenId.get(token.id) ?? 0),
          0,
        ),
      0,
    );

  return {
    markets: candidates.filter(hasLiquidToken),
    candidates: candidates.length,
    liquidTokens: liquidTokenIds.size,
    best5m:
      fiveMinMarkets
        .filter(hasLiquidToken)
        .sort((a, b) => totalBookDepth(b) - totalBookDepth(a))[0] ?? null,
  };
};

export interface PredictV2TestDiagnostics {
  /** Markets returned by the list query (post feed-hygiene). */
  fetched: number;
  /** Markets left after excluding crypto Up/Down. */
  candidates: number;
  /** Tokens found with a two-sided CLOB book. */
  liquidTokens: number;
  /** Markets kept after the liquidity filter (excluding the 5m pick). */
  kept: number;
  /** Slug of the surfaced 5m Up/Down market, when one is quoted. */
  best5m: string | null;
  /** List-fetch failure message, when the underlying query errored. */
  listError: string | null;
  /** Book-check failure message (the filter fails open when this is set). */
  filterError: string | null;
}

export interface UsePredictV2TestSectionResult {
  /** v2 markets ready for the vertical list, capped to V2_TEST_DISPLAY_LIMIT. */
  markets: PredictMarket[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  showEmptyState: boolean;
  /** On-screen filter stage counts (temp diagnostics). */
  diagnostics: PredictV2TestDiagnostics;
}

/**
 * TEMPORARY (Protocol V2 testing): data source for the Predict home
 * "Protocol V2" section. Points at Gamma's `version=v2` listing, filtered
 * down to markets with CLOB book depth, plus the most liquid 5m Up/Down
 * window pinned to the front so there is always one tradeable v2 market.
 * Delete at PRED-1353.
 */
export const usePredictV2TestSection = (): UsePredictV2TestSectionResult => {
  const [list, setList] = useState<{
    markets: PredictMarket[];
    fiveMinConditionIds: string[];
  }>({ markets: [], fiveMinConditionIds: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const result = await fetchV2TestMarkets();
        if (!cancelled) {
          setList(result);
          setError(null);
        }
      } catch (listError) {
        DevLogger.log('[Predict] v2 test list failed:', listError);
        if (!cancelled) {
          setList({ markets: [], fiveMinConditionIds: [] });
          setError(
            listError instanceof Error
              ? listError
              : new Error(String(listError)),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
    return Promise.resolve();
  }, []);

  const { markets, fiveMinConditionIds } = list;

  const [marketsWithLiquidity, setMarketsWithLiquidity] =
    useState<PredictMarket[]>(markets);
  const [isFiltering, setIsFiltering] = useState(true);
  const [diagnostics, setDiagnostics] = useState<PredictV2TestDiagnostics>({
    fetched: 0,
    candidates: 0,
    liquidTokens: 0,
    kept: 0,
    best5m: null,
    listError: null,
    filterError: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsFiltering(true);
      try {
        const result = await filterMarketsWithLiquidity(
          markets,
          fiveMinConditionIds,
        );
        if (!cancelled) {
          // The most liquid 5m Up/Down window is pinned to the front so it
          // is always visible, even when every other v2 market is empty.
          setMarketsWithLiquidity(
            result.best5m ? [result.best5m, ...result.markets] : result.markets,
          );
          setDiagnostics({
            fetched: markets.length,
            candidates: result.candidates,
            liquidTokens: result.liquidTokens,
            kept: result.markets.length,
            best5m: result.best5m?.slug ?? null,
            listError: error ? error.message : null,
            filterError: null,
          });
          setIsFiltering(false);
        }
      } catch (filterError) {
        DevLogger.log(
          '[Predict] v2 liquidity filter failed, showing unfiltered:',
          filterError,
        );
        if (!cancelled) {
          setMarketsWithLiquidity(markets);
          setDiagnostics({
            fetched: markets.length,
            candidates: markets.length,
            liquidTokens: 0,
            kept: markets.length,
            best5m: null,
            listError: error ? error.message : null,
            filterError:
              filterError instanceof Error
                ? filterError.message
                : String(filterError),
          });
          setIsFiltering(false);
        }
      }
    };

    if (markets.length === 0) {
      setMarketsWithLiquidity([]);
      setDiagnostics((previous) => ({
        ...previous,
        fetched: 0,
        candidates: 0,
        liquidTokens: 0,
        kept: 0,
        best5m: null,
        listError: error ? error.message : null,
      }));
      setIsFiltering(false);
      return;
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [markets, fiveMinConditionIds, error]);

  const showEmptyState =
    !isLoading &&
    !isFiltering &&
    (!!error || marketsWithLiquidity.length === 0);

  return {
    markets: marketsWithLiquidity.slice(0, V2_TEST_DISPLAY_LIMIT),
    isLoading: isLoading || isFiltering,
    error,
    refetch,
    showEmptyState,
    diagnostics,
  };
};
