import AppConstants from '../AppConstants';

/**
 * Remote transports over which a dapp can connect without the wallet being
 * able to verify its identity. In-app browser and extension contexts are
 * intentionally absent: there the wallet loads the page itself, so the origin
 * is verifiable and no provenance stamp is needed.
 */
export const RemoteTransport = {
  WalletConnect: 'walletconnect',
  /** MetaMask SDK v1 (socket relay / deeplink). */
  SDKv1: 'sdk-v1',
  /** MetaMask Connect / Mobile Wallet Protocol (SDK v2). */
  MMConnect: 'mmconnect',
} as const;

export type RemoteTransport =
  (typeof RemoteTransport)[keyof typeof RemoteTransport];

/**
 * Maps a remote transport to the `request_source` analytics constant used by
 * the confirmation UI (`useIsExternalAppRequest` via the
 * `confirmationMetrics` slice) and by `getSource()` in RPCMethodMiddleware.
 */
export function getRequestSourceForTransport(
  transport: RemoteTransport,
): string {
  switch (transport) {
    case RemoteTransport.WalletConnect:
      return AppConstants.REQUEST_SOURCES.WC;
    case RemoteTransport.SDKv1:
      return AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN;
    case RemoteTransport.MMConnect:
      return AppConstants.REQUEST_SOURCES.MM_CONNECT;
    default:
      return exhaustiveCheck(transport);
  }
}

function exhaustiveCheck(transport: never): never {
  throw new Error(`Unknown remote transport: ${transport as string}`);
}

/**
 * Provenance of a remote connection, stamped once at the entry point where
 * the connection enters the app (WalletConnect session creation, SDK v1
 * bridge setup, MetaMask Connect bridge adapter).
 *
 * It separates the two identities that were historically conflated in a
 * single `origin` string:
 *
 * - `connectionId` is the wallet-side connection/channel id. It is the only
 * unspoofable identifier the connection has and the only value that may be
 * used as `origin` for permissions, session identity, or anything
 * security-relevant.
 * - `selfReported` is whatever the dapp claimed about itself over the
 * transport (URL, name, icon). It is unverifiable, display-only, and must
 * always be framed as unverified. It must never reach security logic
 * (Blockaid, SIWS) or be presented as a verified origin.
 *
 * This is the mobile-internal shape for the provenance contract agreed in
 * the origin-spoofing thread (MCWP-771). Once the Snaps platform releases
 * the `OriginMetadata` keyring/snap request field (WPC-1194 / WPC-1195,
 * threaded through mobile in PR #34460), `selfReported.url` is what maps to
 * `originMetadata.selfReportedOrigin` at the Snap boundary, while
 * `connectionId` stays the request `origin`.
 */
export interface OriginProvenance {
  /**
   * Unspoofable wallet-side connection/channel id: the WalletConnect
   * channelId, the SDK v1 channelId, or the MetaMask Connect connection id.
   */
  connectionId: string;
  /** Transport the connection arrived on. */
  transport: RemoteTransport;
  /**
   * Always `false`: every field in {@link selfReported} was provided by the
   * remote dapp and cannot be verified by the wallet. Present so future
   * verifiable transports can share the shape without weakening the framing
   * of existing ones.
   */
  isVerified: false;
  /**
   * Self-reported (unverified) dapp metadata. Display-only; never a
   * security input.
   */
  selfReported: {
    url?: string;
    name?: string;
    icon?: string;
  };
}

const provenanceByConnectionId = new Map<string, OriginProvenance>();

/**
 * Record the provenance of a remote connection, keyed by its unspoofable
 * connection id. Call this exactly where the connection enters the app.
 * Re-stamping the same connection id overwrites the previous entry, so
 * reconnects with refreshed metadata stay current.
 */
export function stampOriginProvenance({
  connectionId,
  transport,
  selfReported,
}: {
  connectionId: string;
  transport: RemoteTransport;
  selfReported: OriginProvenance['selfReported'];
}): OriginProvenance {
  const provenance: OriginProvenance = {
    connectionId,
    transport,
    isVerified: false,
    selfReported,
  };
  provenanceByConnectionId.set(connectionId, provenance);
  return provenance;
}

/**
 * Look up the provenance of a remote connection by its unspoofable
 * connection id. Returns `undefined` for ids that were never stamped, which
 * includes every verifiable context (in-app browser tabs are keyed by
 * hostname, not connection id).
 */
export function getOriginProvenance(
  connectionId: string,
): OriginProvenance | undefined {
  return provenanceByConnectionId.get(connectionId);
}

/**
 * Drop the provenance for a closed connection.
 */
export function removeOriginProvenance(connectionId: string): void {
  provenanceByConnectionId.delete(connectionId);
}
