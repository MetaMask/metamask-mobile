import { useSelector } from 'react-redux';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import { RootState } from '../../reducers';
import { isUUID } from '../../core/SDKConnect/utils/isUUID';
import { SourceType } from './useAnalytics/useAnalytics.types';
import AppConstants from '../../core/AppConstants';

interface UseOriginSourceProps {
  origin?: string;
}

type SourceTypeValue = (typeof SourceType)[keyof typeof SourceType];
type RequestSourcesMap = typeof AppConstants.REQUEST_SOURCES;
export type RequestSource =
  | RequestSourcesMap['SDK_REMOTE_CONN']
  | RequestSourcesMap['MM_CONNECT']
  | RequestSourcesMap['WC']
  | RequestSourcesMap['IN_APP_BROWSER'];

export interface OriginSource {
  source: SourceTypeValue;
  requestSource: RequestSource;
}

// Pairs each detected SourceType branch with the canonical REQUEST_SOURCES
// value emitted by signature/transaction events, so connect events join the
// Mixpanel funnel natively on request_source.
const SOURCE_TO_REQUEST_SOURCE: Record<SourceTypeValue, RequestSource | undefined> = {
  [SourceType.SDK]: AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
  [SourceType.MM_CONNECT]: AppConstants.REQUEST_SOURCES.MM_CONNECT,
  [SourceType.WALLET_CONNECT]: AppConstants.REQUEST_SOURCES.WC,
  [SourceType.IN_APP_BROWSER]: AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
  [SourceType.PERMISSION_SYSTEM]: undefined,
  [SourceType.DAPP_DEEPLINK_URL]: undefined,
};

/**
 * Determines the connection source type for analytics from a permission-request origin.
 *
 * The origin value varies by connection type:
 * - SDK v2 (MWP): bare UUID (the connection/session ID)
 * - SDK v1: bare UUID, or prefixed with "MMSDKREMOTE::"
 * - WalletConnect: the dapp URL (no special prefix)
 * - In-app browser: the dapp URL
 *
 * We check in priority order: SDK v2 → SDK v1 → WalletConnect → browser.
 *
 * Returns both the legacy `source` value (kept for historical continuity on
 * Connect Request events) and a `requestSource` value aligned with the
 * existing sig/tx `request_source` vocabulary for cross-funnel joins.
 */
export const useOriginSource = ({
  origin,
}: UseOriginSourceProps): OriginSource | undefined => {
  const { wc2Metadata, v2Connections } = useSelector(
    (state: RootState) => state.sdk,
  );

  if (!origin) {
    return undefined;
  }

  let source: SourceTypeValue = SourceType.IN_APP_BROWSER;

  // --- SDK v2 (MWP) ---
  if (isUUID(origin) && v2Connections?.[origin]) {
    source = SourceType.MM_CONNECT;
  } else if (origin.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)) {
    // --- SDK v1 (prefixed host) ---
    source = SourceType.SDK;
  } else if (
    isUUID(origin) &&
    SDKConnect.getInstance().getConnection({ channelId: origin })
  ) {
    // --- SDK v1 (bare UUID) ---
    source = SourceType.SDK;
  } else if (wc2Metadata?.id && wc2Metadata.id.length > 0) {
    // --- WalletConnect ---
    source = SourceType.WALLET_CONNECT;
  }

  const requestSource =
    SOURCE_TO_REQUEST_SOURCE[source] ??
    AppConstants.REQUEST_SOURCES.IN_APP_BROWSER;

  return { source, requestSource };
};

export default useOriginSource;
