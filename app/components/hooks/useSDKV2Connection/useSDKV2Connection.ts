import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';

/**
 * Custom hook to get SDK v2 connection information for a given origin
 * @param origin - The origin string to look up
 * @returns Object containing isV2 flag and sdkV2Connection data
 */
export const useSDKV2Connection = (origin?: string) => {
  const { v2Connections } = useSelector((state: RootState) => state.sdk);

  const sdkV2Connection: (ConnectionProps & { isV2?: boolean }) | undefined =
    v2Connections[origin ?? ''];

  const isV2 = Boolean(sdkV2Connection?.isV2);

  return {
    isV2,
    sdkV2Connection,
  };
};
