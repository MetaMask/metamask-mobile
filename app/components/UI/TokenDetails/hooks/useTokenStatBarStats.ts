import { useMemo } from 'react';
import {
  TokenStatKey,
  type TokenStatValues,
} from '../components/V1/StatBar/StatBar.types';
import {
  getLiquidityToMarketCapRatio,
  isLowLiquidityToMarketCapRatio,
} from '../utils/liquidityToMarketCap';

/**
 * Stand-in figures for the stats Liq/MC is derived from. The prototype's own
 * numbers put liquidity at nearly five times market cap, which no real token
 * reaches, so these are plausible memecoin values instead: thin enough to sit
 * in the amber band and keep that state visible while the data is mocked.
 */
const MOCK_LIQUIDITY_USD = 560_000;
const MOCK_MARKET_CAP_USD = 12_400_000;

const MOCK_LIQUIDITY_TO_MARKET_CAP_RATIO = getLiquidityToMarketCapRatio(
  MOCK_LIQUIDITY_USD,
  MOCK_MARKET_CAP_USD,
);

/**
 * Stand-in values, including the null circulating supply that demonstrates the
 * gray-dash rule.
 */
const MOCK_STATS: TokenStatValues = {
  [TokenStatKey.MarketCap]: { value: '$12.4M' },
  [TokenStatKey.Liquidity]: { value: '$560.0K' },
  [TokenStatKey.Volume24h]: { value: '$48.3M' },
  [TokenStatKey.Holders]: { value: '12.9K' },
  [TokenStatKey.Top10]: { value: '18.4%' },
  [TokenStatKey.LiquidityToMarketCap]: {
    value:
      MOCK_LIQUIDITY_TO_MARKET_CAP_RATIO == null
        ? null
        : `${(MOCK_LIQUIDITY_TO_MARKET_CAP_RATIO * 100).toFixed(2)}%`,
    isWarning: isLowLiquidityToMarketCapRatio(
      MOCK_LIQUIDITY_TO_MARKET_CAP_RATIO,
    ),
  },
  [TokenStatKey.Tax]: { value: '0% / 0%' },
  [TokenStatKey.HighLow24h]: { value: '$0.043120 / $0.039812' },
  [TokenStatKey.CirculatingSupply]: { value: null },
};

/**
 * Formatted statistics for the Token Details V1 stat bar.
 *
 * TODO(ASSETS-4019): return real values. The hook will take the token and its
 * security data, both of which `TokenDetailsV1` already holds, and draw on two
 * sources.
 *
 * MCap, 24h Vol, 24h high/low and Circulating supply come from the unified
 * `AssetsController`, through `getAssetsPrice` in `app/selectors/assets`, keyed
 * by the CAIP-19 asset ID `useTokenCaipAssetId` returns: `marketCap`,
 * `totalVolume`, `high1d`/`low1d` and `circulatingSupply`. Every field on
 * `FungibleAssetPrice` is optional, so each stat falls back to the gray dash on
 * its own rather than the bar emptying as a unit. Do not reach for
 * `selectTokenMarketData`: `TokenRatesController` is deprecated via the
 * `assetsUnifyState` flag's `deprecatedControllers` list, and once listed it
 * never initialises, so that selector returns nothing rather than failing
 * loudly. `ShareTokenBottomSheet` still reads it and is not a model to copy.
 *
 * Holders, Top 10, Liquidity and Tax come from the security data:
 * `financialStats.holdersCount`, `financialStats.topHolders[]` summed over
 * `holdingPercentage`, `financialStats.markets[]` summed over `reserveUSD`, and
 * `fees.buy`/`fees.sell`.
 *
 * Liq/MC spans both sources, so it is absent whenever either side is. Build its
 * denominator as `circulatingSupply * usdPrice` rather than reading `marketCap`
 * directly: `reserveUSD` is USD while `marketCap` follows the user's selected
 * currency, and dividing across the two scales the ratio by the exchange rate
 * without looking wrong. Feed the result to `getLiquidityToMarketCapRatio`,
 * which already encodes the amber threshold.
 *
 * Still unverified: whether `assetsPrice` is populated for a token the user
 * does not hold. If it only covers tracked assets, this needs the same kind of
 * fetch fallback `ShareTokenBottomSheet` uses for market data.
 *
 * Liq/MC, Top 10 and Holders also render on the Security tab, so ASSETS-4056
 * requires both places to read the same computed value. Keeping the
 * computation behind this hook gives that work one place to land instead of
 * leaving it inlined in the view.
 */
export const useTokenStatBarStats = (): TokenStatValues =>
  useMemo(() => MOCK_STATS, []);
