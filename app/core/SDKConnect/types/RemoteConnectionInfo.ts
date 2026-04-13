import { OriginatorInfo } from '@metamask/sdk-communication-layer';

/**
 * Internal representation of remote connection originator metadata.
 *
 * Mirrors OriginatorInfo from @metamask/sdk-communication-layer but uses
 * `remoteSessionId` instead of `anonId` to align with the segment-schema
 * and dapp-side SDK naming (`remote_session_id`).
 */
export interface RemoteConnectionInfo {
  url: string;
  title: string;
  platform: string;
  dappId: string;
  remoteSessionId?: string;
  icon?: string;
  scheme?: string;
  source?: string;
  apiVersion?: string;
  connector?: string;
}

/**
 * Maps an OriginatorInfo from @metamask/sdk-communication-layer
 * to the internal RemoteConnectionInfo type.
 */
export function toRemoteConnectionInfo(
  oi: OriginatorInfo,
): RemoteConnectionInfo {
  const { anonId, ...rest } = oi;
  return {
    ...rest,
    remoteSessionId: anonId,
  };
}
