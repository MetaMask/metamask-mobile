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
 */
export const useOriginSource = ({
  origin,
}: UseOriginSourceProps): SourceTypeValue | undefined => {
  const { wc2Metadata, v2Connections } = useSelector(
    (state: RootState) => state.sdk,
  );

  if (!origin) {
    return undefined;
  }

  // --- SDK v2 (MWP) ---
  // V2 connections use the bare session UUID as the permission-system origin.
  // Look it up in the v2Connections store (populated by
  // HostApplicationAdapter.syncConnectionList, keyed by connection ID).
  if (isUUID(origin) && v2Connections?.[origin]) {
    return SourceType.SDK_CONNECT_V2;
  }

  // --- SDK v1 ---
  // V1 origins are either a bare UUID (channel ID) found in the SDKConnect
  // singleton, or prefixed with "MMSDKREMOTE::" (used as the connection host
  // in approved-hosts, display logic, etc.).
  if (origin.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)) {
    return SourceType.SDK;
  }
  if (isUUID(origin)) {
    const sdkConnection = SDKConnect.getInstance().getConnection({
      channelId: origin,
    });
    if (sdkConnection) {
      return SourceType.SDK;
    }
  }

  // --- WalletConnect ---
  // wc2Metadata is a single Redux slot holding the *most recent* WC proposal
  // metadata (set on session_proposal, cleared after approval/rejection).
  // It is not keyed by origin — we rely on the WC proposal flow being
  // serialized (via proposalLock in WalletConnectV2) so that during the
  // approval window, a non-empty id implies *this* origin is from WC.
  if (wc2Metadata?.id && wc2Metadata.id.length > 0) {
    return SourceType.WALLET_CONNECT;
  }

  return SourceType.IN_APP_BROWSER;
};

export default useOriginSource;
