import { useSelector } from 'react-redux';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import { RootState } from '../../reducers';
import { isUUID } from '../../core/SDKConnect/utils/isUUID';
import { SourceType } from './useMetrics/useMetrics.types';
import AppConstants from '../../core/AppConstants';

interface UseOriginSourceProps {
  origin?: string;
}

type SourceTypeValue = (typeof SourceType)[keyof typeof SourceType];

export const useOriginSource = ({
  origin,
}: UseOriginSourceProps): SourceTypeValue | undefined => {
  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  // Return undefined if origin is undefined
  if (!origin) {
    return undefined;
  }

  // Check for V2 connections
  if (origin.startsWith(AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN)) {
    return SourceType.SDK_CONNECT_V2;
  }

  // Check if origin is a UUID (SDK channel ID format) or starts with SDK_REMOTE_ORIGIN
  const isChannelId = isUUID(origin);
  const isSDKRemoteOrigin = origin.startsWith(
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
  );

  const sdkConnection = isChannelId
    ? SDKConnect.getInstance().getConnection({ channelId: origin })
    : undefined;

  // Check if it's SDK (either by UUID connection or remote origin)
  if (sdkConnection || isSDKRemoteOrigin) {
    return SourceType.SDK;
  }

  // Check if origin matches WalletConnect metadata
  const isWalletConnect = wc2Metadata?.id && wc2Metadata.id.length > 0;
  if (isWalletConnect) {
    return SourceType.WALLET_CONNECT;
  }

  return SourceType.IN_APP_BROWSER;
};

export default useOriginSource;
