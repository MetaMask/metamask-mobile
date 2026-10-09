import { v5 as uuidv5 } from 'uuid';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import type { IMetaMetricsEvent } from '../Analytics/MetaMetrics.types';

/**
 * Fixed namespace used to derive WalletConnect `remote_session_id` values.
 * Must never change: it is what makes the derivation stable across app
 * launches and across app versions.
 */
export const WC_SESSION_ID_NAMESPACE = '2e7bd3d3-2b90-40a0-9e86-bbbab5a1ddc5';

// Why the session id is derived rather than randomly generated:
//
// - The value must be identical in the connection-lifecycle events (emitted by
//   WalletConnectV2 while handling the session proposal) and in the
//   transaction/signature events (emitted much later by the RPC middleware via
//   the per-session BackgroundBridge). Deriving from the pairing topic means
//   both sides arrive at the same id without sharing state or persisting
//   anything, and it survives app restarts and session restoration.
// - It keeps remote_session_id a UUID, matching the shape MetaMask Connect
//   (MWP) and SDK v1 already emit, so warehouse joins on that column work
//   uniformly across transports.
// - Hashing avoids putting the raw WalletConnect pairing topic — a protocol
//   identifier for the pairing — into analytics.
//
// NOTE ON JOIN SEMANTICS: for MetaMask Connect, remote_session_id equals the
// dapp-side anon_id, so the join is dapp -> wallet. WalletConnect has no
// first-party dapp-side telemetry, so this id is wallet-generated and the join
// is wallet-internal: WC connection events <-> WC transaction/signature events.
// That is enough for connection success rate and conversion-to-transaction,
// which is what the WC vs MetaMask Connect comparison needs.
/**
 * Derive the analytics `remote_session_id` for a WalletConnect connection from
 * its pairing topic (which is what we use as the `channelId` everywhere in the
 * WC code).
 */
export function getWalletConnectSessionId(pairingTopic: string): string {
  return uuidv5(pairingTopic, WC_SESSION_ID_NAMESPACE);
}

/**
 * Fire-and-forget analytics helper for WalletConnect flows.
 * Never throws — a broken analytics call must not block connection handling.
 *
 * Mirrors `trackMwpEvent` for the MWP transport; kept separate so each
 * transport owns its own telemetry entry point.
 */
export function trackWalletConnectEvent(
  event: IMetaMetricsEvent,
  properties: Record<string, unknown>,
): void {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
    );
  } catch {
    // Intentionally swallowed: analytics must not block WalletConnect flows.
  }
}
