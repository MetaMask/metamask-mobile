import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { CaipAssetType, Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import { getLocaleLanguageCode } from '../../components/hooks/useFormatters';
import { selectAssetsBySelectedAccountGroup } from '../../selectors/assets/assets-list';
import { selectTokenMarketData } from '../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../selectors/multichain/multichain';
import { formatWithThreshold } from '../../util/assets';

/**
 * Minimum holding value (in the user's fiat currency) for a token to appear in
 * the widget. Filters out dust / zero positions.
 */
export const WIDGET_MIN_HOLDING_VALUE = 1;

/**
 * Maximum number of tokens written to the widget. The Large family shows ~6-8
 * rows; we cap a little higher so reordering on the home screen stays stable.
 */
export const WIDGET_MAX_TOKENS = 10;

/**
 * A single row in the widget: token logo (resolved natively from `logoUrl`),
 * symbol on the left, unit market price on the right.
 */
export interface WidgetTokenEntry {
  symbol: string;
  /** Pre-formatted unit market price in the user's currency, e.g. "$1.00". */
  priceFormatted: string;
  /**
   * Remote logo URL. Transient: {@link syncWidgetLogos} downloads this into the
   * App Group container and replaces it with a local `logoFile` before the
   * payload is written to the widget.
   */
  logoUrl: string;
  /**
   * Deep link that opens the Swap screen with this token preselected as the
   * source. Undefined when a CAIP-19 asset id can't be derived. Consumed
   * directly by the widget (Swift no longer remaps field names).
   */
  deeplink?: string;
  /**
   * 24h price change as a percentage (e.g. `2.31`, `-0.04`). Real market data;
   * undefined when no rate is available. The widget colors it green/red and
   * prefixes a ▲/▼ arrow.
   */
  priceChange1d?: number;
  /**
   * Price points used to draw the row's mini sparkline (visualization only).
   * The widget renders whatever series it receives; see {@link buildSparkline}.
   */
  sparkline?: number[];
}

/** Number of points in a row's sparkline. */
const SPARKLINE_POINTS = 16;

/**
 * Returns the real 24h price-change percentage for an asset, mirroring
 * {@link useTokenPricePercentageChange}: EVM tokens are keyed by
 * `[chainId][address]` in the TokenRatesController market data (native tokens
 * use the chain's native-token address), and non-EVM assets come from the
 * multichain rates controller keyed by their CAIP-19 asset id.
 */
function getPricePercentChange1d(
  asset: {
    address?: Hex;
    assetId: string;
    chainId: string;
    isNative: boolean;
  },
  marketData: ReturnType<typeof selectTokenMarketData>,
  multichainRates: ReturnType<typeof selectMultichainAssetsRates>,
): number | undefined {
  const nonEvmChange =
    multichainRates?.[asset.assetId as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D;
  if (nonEvmChange !== undefined) {
    return nonEvmChange;
  }

  const chainId = asset.chainId as Hex;
  const lookupAddress = asset.isNative
    ? (getNativeTokenAddress(chainId) as Hex)
    : asset.address;
  if (!lookupAddress) {
    return undefined;
  }
  return marketData?.[chainId]?.[lookupAddress]?.pricePercentChange1d;
}

/**
 * Builds the price series for a token's sparkline.
 *
 * MOCK DATA: this currently synthesizes a deterministic series seeded by the
 * token symbol (so a given token renders the same shape every sync — keeping
 * {@link WidgetSyncManager}'s payload dedup intact) and biased to trend in the
 * direction of `priceChange1d` so the line visually agrees with the ▲/▼ arrow.
 * To wire real data later, replace this body with a historical-price fetch
 * (e.g. price.api.cx.metamask.io/v3/historical-prices) — the rest of the
 * pipeline already passes a `number[]` straight through to the widget.
 */
function buildSparkline(symbol: string, priceChange1d?: number): number[] {
  // Small string hash → seed, for a cheap deterministic PRNG (mulberry32).
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Overall drift matches the 24h change sign; small per-point jitter on top.
  const drift = (priceChange1d ?? 0) >= 0 ? 1 : -1;
  const points: number[] = [];
  let value = 100;
  for (let i = 0; i < SPARKLINE_POINTS; i++) {
    value += drift * rand() * 2 + (rand() - 0.5) * 3;
    points.push(value);
  }
  return points;
}

/**
 * Builds a swap deep link that preselects `caipAssetId` as the source token.
 * The app maps `metamask://` to the universal link and routes it to the Bridge
 * (unified swap) view — see handleSwapUrl.ts.
 */
function buildSwapDeeplink(caipAssetId: string): string {
  return `metamask://swap?from=${encodeURIComponent(caipAssetId)}`;
}

export interface WidgetTokenPayload {
  tokens: WidgetTokenEntry[];
}

const EMPTY_PAYLOAD: WidgetTokenPayload = { tokens: [] };

/**
 * Builds the widget payload from Redux state: every token held by the selected
 * account group, across all chains, whose holding value is over
 * {@link WIDGET_MIN_HOLDING_VALUE}, sorted by holding value descending and
 * capped at {@link WIDGET_MAX_TOKENS}. The right-hand figure is the token's
 * **unit market price** (holding fiat value ÷ token balance), not the holding
 * value.
 *
 * Pure function (no I/O) so it can be unit-tested without the native bridge.
 */
export function buildWidgetPayload(state: RootState): WidgetTokenPayload {
  const assetsByChain = selectAssetsBySelectedAccountGroup(state);
  const marketData = selectTokenMarketData(state);
  const multichainRates = selectMultichainAssetsRates(state);

  const held = Object.values(assetsByChain)
    .flat()
    .map((asset) => {
      const fiatBalance = asset.fiat?.balance ?? 0;
      const tokenBalance = parseFloat(asset.balance ?? '0');
      return { asset, fiatBalance, tokenBalance };
    })
    .filter(
      ({ fiatBalance, tokenBalance }) =>
        fiatBalance > WIDGET_MIN_HOLDING_VALUE && tokenBalance > 0,
    )
    .sort((a, b) => b.fiatBalance - a.fiatBalance)
    .slice(0, WIDGET_MAX_TOKENS);

  if (held.length === 0) {
    return EMPTY_PAYLOAD;
  }

  const tokens: WidgetTokenEntry[] = held.map(
    ({ asset, fiatBalance, tokenBalance }) => {
      const unitPrice = fiatBalance / tokenBalance;
      const currency = asset.fiat?.currency ?? 'usd';
      // EVM assets carry a Hex assetId + Hex chainId; non-EVM assets already
      // carry a CAIP-19 assetId (passed through). formatAddressToAssetId resolves
      // native tokens to the correct per-chain CAIP id.
      const caipAssetId = formatAddressToAssetId(asset.assetId, asset.chainId);
      const priceChange1d = getPricePercentChange1d(
        asset,
        marketData,
        multichainRates,
      );
      return {
        symbol: asset.symbol,
        // Mirrors how the token list formats fiat (assets-list.ts): currency
        // style with a sub-cent threshold so prices below $0.01 show "< $0.01".
        priceFormatted: formatWithThreshold(
          unitPrice,
          0.01,
          getLocaleLanguageCode(),
          { style: 'currency', currency },
        ),
        logoUrl: asset.image ?? '',
        deeplink: caipAssetId ? buildSwapDeeplink(caipAssetId) : undefined,
        priceChange1d,
        sparkline: buildSparkline(asset.symbol, priceChange1d),
      };
    },
  );

  return { tokens };
}
