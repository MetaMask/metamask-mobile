import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';

/**
 * Custom hook to get SDK v2 connection information for a given origin
 * @param origin - The origin string to look up
 * @returns SDK v2 connection object or undefined if not found
 */
export const useSDKV2Connection = (origin?: string) => {
  const { v2Connections } = useSelector((state: RootState) => state.sdk);

  const sdkV2Connection: (ConnectionProps & { isV2?: boolean }) | undefined =
    v2Connections[origin ?? ''];

  return sdkV2Connection;
};
