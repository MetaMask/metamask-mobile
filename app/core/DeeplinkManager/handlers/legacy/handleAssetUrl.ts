import {
  CaipAssetType,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
  isCaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { fetchAssetMetadata } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { TokenI } from '../../../../components/UI/Tokens/types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import Logger from '../../../../util/Logger';
import { TokenDetailsSource } from '../../../../components/UI/TokenDetails/constants/constants';
import { MetaMetricsEvents } from '../../../Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

interface HandleAssetUrlParams {
  assetPath: string;
}

const buildAssetNavigationParams = async ({
  assetId,
}: {
  assetId: CaipAssetType;
}): Promise<TokenI | null> => {
  try {
    const asset = parseCaipAssetType(assetId);
    const { chain, chainId } = asset;

    const metadata = await fetchAssetMetadata(assetId, chainId);
    if (!metadata) {
      Logger.log(
        '[handleAssetUrl] Token metadata not found for asset:',
        assetId,
      );
      return null;
    }

    const isEvmNamespace = chain.namespace === KnownCaipNamespace.Eip155;
    const isNative = asset.assetNamespace === 'slip44';

    const chainIdForNav = (): Hex | CaipChainId =>
      isEvmNamespace ? formatChainIdToHex(chain.reference) : chainId;

    const addressForNav = (): Hex | CaipAssetType => {
      if (isEvmNamespace && isNative) {
        return ZERO_ADDRESS;
      }

      if (isEvmNamespace && !isNative) {
        return asset.assetReference as Hex;
      }

      return assetId;
    };

    const token: TokenI = {
      address: addressForNav(),
      chainId: chainIdForNav(),
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: metadata.decimals,
      rwaData: metadata.rwaData,
      image: metadata.image ?? '',
      logo: metadata.image ?? undefined,
      balance: '0',
      isNative,
      isETH: undefined,
    };

    return token;
  } catch {
    return null;
  }
};

const handleTokenDetailsNavigation = (
  token?: TokenI | null,
  source?: TokenDetailsSource,
) => {
  if (!token) {
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
    return;
  }

  NavigationService.navigation.navigate('Asset', { ...token, source });
};

/**
 * Resolve the optional `source` query param into a known TokenDetailsSource.
 * Whitelisting against the enum prevents an arbitrary deeplink from injecting
 * unexpected values into analytics.
 */
const parseSource = (value: string | null): TokenDetailsSource | undefined =>
  value && (Object.values(TokenDetailsSource) as string[]).includes(value)
    ? (value as TokenDetailsSource)
    : undefined;

/**
 * Derive `time_to_open` (seconds) from a `triggered_at` query param. Accepts an
 * epoch in seconds or milliseconds, or an ISO-8601 string. Returns undefined
 * when absent/unparseable or when the timestamp is in the future.
 */
const parseTimeToOpenSeconds = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const numeric = Number(value);
  let triggeredMs: number;
  if (Number.isFinite(numeric) && numeric > 0) {
    // 10-digit values are epoch seconds; 13-digit values are milliseconds.
    triggeredMs = numeric < 1e12 ? numeric * 1000 : numeric;
  } else {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return undefined;
    triggeredMs = parsed;
  }
  const elapsedSeconds = (Date.now() - triggeredMs) / 1000;
  return elapsedSeconds >= 0 ? Math.round(elapsedSeconds) : undefined;
};

/**
 * "Price Alert Notification Opened" — measures notification open rate.
 *
 * Fired when an asset deeplink carrying `source=price_alert_notification` is
 * opened. `token_symbol` and `asset_type` are derived from the resolved asset;
 * the alert-specific fields (`alert_type`, `price_at_trigger`, and the
 * `triggered_at` used for `time_to_open`) are read from the deeplink, so the
 * price-alerts backend must include them in the notification URL for those
 * properties to be populated.
 */
const trackPriceAlertNotificationOpened = (
  urlParams: URLSearchParams,
  token: TokenI | null,
) => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PRICE_ALERT_NOTIFICATION_OPENED,
      )
        .addProperties({
          asset_id: urlParams.get('assetId'),
          token_symbol: token?.ticker || token?.symbol,
          alert_type: urlParams.get('alert_type'),
          price_at_trigger: Number.parseFloat(
            urlParams.get('price_at_trigger') as string,
          ),
          time_to_open: parseTimeToOpenSeconds(urlParams.get('triggered_at')),
        })
        .build(),
    );
  } catch {
    // Analytics must never block notification navigation.
  }
};

/**
 * Asset deeplink handler
 *
 * Supported URL formats:
 * - https://link.metamask.io/asset?assetId=eip155:1/erc20:0x...
 * - https://link.metamask.io/asset?assetId=eip155:1/slip44:60
 * - https://link.metamask.io/asset?assetId=eip155:1/erc20:0x...
 */
export const handleAssetUrl = async ({ assetPath }: HandleAssetUrlParams) => {
  Logger.log(
    '[handleAssetUrl] Starting asset deeplink handling with path:',
    assetPath,
  );

  try {
    const urlParams = new URLSearchParams(
      assetPath.includes('?') ? assetPath.split('?')[1] : '',
    );
    const assetParam = urlParams.get('assetId');

    if (!assetParam) {
      Logger.log('[handleAssetUrl] Missing asset parameter');
      return;
    }

    if (!isCaipAssetType(assetParam as CaipAssetType)) {
      Logger.log(
        '[handleAssetUrl] Invalid CAIP-19 asset parameter:',
        assetParam,
      );
      return;
    }

    const assetId = assetParam as CaipAssetType;
    const source = parseSource(urlParams.get('source'));

    const assetParams = await buildAssetNavigationParams({
      assetId,
    }).catch(() => null);

    if (source === TokenDetailsSource.PriceAlertNotification) {
      trackPriceAlertNotificationOpened(urlParams, assetParams);
    }

    handleTokenDetailsNavigation(assetParams, source);
  } catch (error) {
    Logger.log('[handleAssetUrl] Failed to handle asset deeplink:', error);
    handleTokenDetailsNavigation(null);
  }
};
