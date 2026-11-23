import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { TOKEN_API_BASE_URL } from '../../../components/UI/Assets/watchlist/utils/getTokens';
import { PRICE_API_BASE_URL } from '../../../constants/urls';
import {
  TOKEN_DETAILS_V1_TABS,
  type TokenDetailsV1TabKey,
} from '../../../components/UI/TokenDetails/constants/constants';

interface AssetsMemecoinTdpV1FeatureFlag {
  enabled?: boolean;
  /** Tab order and allowlist for the V1 page. */
  tabConfigOrder?: unknown;
  /** Token API host the V1 page calls `/v2/assets` on. */
  tokenApiBaseUrl?: unknown;
  /** Price API host the V1 page's price, chart and market data calls use. */
  priceApiBaseUrl?: unknown;
}

/**
 * Whether the Memecoin Token Details Page (TDP) V1 experience is enabled.
 *
 * Remote flag key: `assetsMemecoinTdpV1`. Resolved shape is `{ enabled: boolean }`
 * (version / threshold rollout is handled by RemoteFeatureFlagController).
 */
export const selectAssetsMemecoinTdpV1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const featureFlag = (remoteFeatureFlags[
      FeatureFlagNames.assetsMemecoinTdpV1
    ] ?? DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.assetsMemecoinTdpV1]) as
      | AssetsMemecoinTdpV1FeatureFlag
      | undefined;

    return Boolean(featureFlag?.enabled);
  },
);

/**
 * Config the variation carries alongside `enabled`, or `null` when the
 * feature is off.
 *
 * Both selectors below read through this, so neither can honour a config
 * entry on a wallet that is not getting the V1 page in the first place. Every
 * entry is optional, and every unreadable value falls back to the built-in
 * default, so a binary that predates an entry — or meets a variation someone
 * mistyped — renders exactly as it does today.
 */
const selectAssetsMemecoinTdpV1Config = createSelector(
  selectRemoteFeatureFlags,
  selectAssetsMemecoinTdpV1Enabled,
  (remoteFeatureFlags, isEnabled): AssetsMemecoinTdpV1FeatureFlag | null => {
    if (!isEnabled) {
      return null;
    }

    return (
      (remoteFeatureFlags[
        FeatureFlagNames.assetsMemecoinTdpV1
      ] as AssetsMemecoinTdpV1FeatureFlag) ?? null
    );
  },
);

const KNOWN_TABS: ReadonlySet<string> = new Set(TOKEN_DETAILS_V1_TABS);

/**
 * Tabs the V1 page renders, in order.
 *
 * The array is both an order and an allowlist: a tab left out of it never
 * renders. It does not grant a tab — Feed and Holders still have to clear the
 * social-leaderboard gate, and Holders the empty-list gate, in
 * `TokenDetailsV1`.
 *
 * Unknown keys are dropped rather than trusted, which is what lets a
 * variation name a tab a future release adds without blanking the page on
 * every wallet already running. An array with nothing usable left in it falls
 * back to the default order for the same reason.
 */
export const selectMemecoinTdpV1TabConfigOrder = createSelector(
  selectAssetsMemecoinTdpV1Config,
  (config): TokenDetailsV1TabKey[] => {
    const tabConfigOrder = config?.tabConfigOrder;

    if (!Array.isArray(tabConfigOrder)) {
      return TOKEN_DETAILS_V1_TABS;
    }

    const tabs = Array.from(new Set(tabConfigOrder)).filter(
      (tab): tab is TokenDetailsV1TabKey =>
        typeof tab === 'string' && KNOWN_TABS.has(tab),
    );

    return tabs.length > 0 ? tabs : TOKEN_DETAILS_V1_TABS;
  },
);

/**
 * Only an absolute `https` origin is accepted. A relative value or a bare
 * scheme would build a request URL that fails at fetch time rather than here,
 * where the fallback can still catch it.
 */
const ABSOLUTE_HTTPS_ORIGIN = /^https:\/\/[^/\s]+/;

/**
 * Token API host the V1 page calls `/v2/assets` on.
 *
 * Remote config is the only way to move off prod. It exists because the prod
 * API does not return `launchpadData` yet, and that field is what identifies a
 * token as a memecoin at all, so the page cannot be exercised end to end
 * without pointing it somewhere that does.
 *
 * The value is an origin and nothing more — `https://token.dev-api.cx.metamask.io`,
 * the same shape as {@link TOKEN_API_BASE_URL} — because callers append
 * `/v2/assets` themselves.
 *
 * Only the three Token Details V1 callers read this, and they read it so they
 * share one react-query entry. Every other token API consumer in the app goes
 * through different code that cannot see the flag.
 */
export const selectMemecoinTdpV1TokenApiBaseUrl = createSelector(
  selectAssetsMemecoinTdpV1Config,
  (config): string => {
    const tokenApiBaseUrl = config?.tokenApiBaseUrl;

    if (
      typeof tokenApiBaseUrl !== 'string' ||
      !ABSOLUTE_HTTPS_ORIGIN.test(tokenApiBaseUrl)
    ) {
      return TOKEN_API_BASE_URL;
    }

    return tokenApiBaseUrl;
  },
);

/**
 * Price API host the V1 page's spot-prices, historical-prices and OHLCV
 * requests use, including the `/latest` candle the chart polls when its
 * WebSocket goes quiet.
 *
 * Exists for the same reason as {@link selectMemecoinTdpV1TokenApiBaseUrl}: a
 * token new enough to be worth opening the V1 page for is often absent from
 * the prod price API, so the page cannot be exercised end to end without
 * pointing it somewhere that has the data.
 *
 * The value is an origin and nothing more — `https://price.dev-api.cx.metamask.io`
 * — because callers append their own `/v3/...` path.
 *
 * Reaching the callers is the job of `PriceApiHostProvider`, which wraps only
 * the V1 page. Two requests deliberately ignore this and stay on prod: the
 * headline price, which goes through a utility Bridge and swaps also use, and
 * the chart's scroll-back pagination, which the WebView's CSP pins to prod.
 *
 * The OHLCV WebSocket is a third exception, but not one this could fix: its
 * gateway comes from `MM_BACKEND_WEBSOCKET_URL` at build time, so on a build
 * pointed at prod the live stream stays there while `/latest` follows this.
 * That is the intended split — `/latest` is the fallback that has to return
 * data when the stream has none for the asset.
 */
export const selectMemecoinTdpV1PriceApiBaseUrl = createSelector(
  selectAssetsMemecoinTdpV1Config,
  (config): string => {
    const priceApiBaseUrl = config?.priceApiBaseUrl;

    if (
      typeof priceApiBaseUrl !== 'string' ||
      !ABSOLUTE_HTTPS_ORIGIN.test(priceApiBaseUrl)
    ) {
      return PRICE_API_BASE_URL;
    }

    return priceApiBaseUrl;
  },
);
