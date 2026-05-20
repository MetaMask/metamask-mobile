/**
 * Shared types for the WalletConnect non-EVM (multichain) adapter layer.
 *
 * Each non-EVM chain (Tron today, Solana / Bitcoin tomorrow) ships a
 * `ChainAdapter` that knows how to:
 * - detect interest in a dapp proposal,
 * - enrich the CAIP-25 caveat value for this chain,
 * - build the namespace slice for the WalletConnect session,
 * - map WC-shaped requests into the Snap's parameter shape,
 * - normalize the Snap response back into what dapps expect.
 *
 * The WC2 session classes never look at chain-specific data — they
 * delegate to the adapter for the request's CAIP-2 namespace through
 * the helpers in `./helpers` and the per-chain entries in `./registry`.
 */
import type {
  CaipChainId,
  KnownCaipNamespace,
  CaipAccountId,
} from '@metamask/utils';
import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import { type WalletKitTypes } from '@reown/walletkit';

/** Shape of a single namespace slice in WalletConnect's approved namespaces map. */
export interface NamespaceConfig {
  chains: CaipChainId[];
  methods: string[];
  events: string[];
  accounts: CaipAccountId[];
}

/** Snap-shaped request after WC method translation. */
export interface SnapMappedRequest<Param = unknown> {
  method: string;
  params: Param;
}

/**
 * Arguments passed to a chain adapter's `handleRequest` method for routing through
 */
export interface AdapterHandleRequestArgs {
  channelId: string;
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
  requestId: number;
  method: string;
  params: unknown;
}

/**
 * Minimal shape of a WalletConnect session proposal
 */
export type ProposalParamsLight = Pick<
  WalletKitTypes.SessionProposal['params'],
  'optionalNamespaces' | 'requiredNamespaces'
>;

/**
 * Adapter contract every non-EVM chain implements. Registered in
 * `./registry.ts` behind a per-chain feature flag.
 */
export interface ChainAdapter {
  /** CAIP-2 namespace this adapter handles ('tron', 'solana', ...). */
  namespace: KnownCaipNamespace;

  /**
   * Methods in this namespace that should redirect the user back to the
   * dapp after the wallet finishes handling them.
   */
  redirectMethods: readonly string[];

  /**
   * Methods in this namespace that are approved for use in WC sessions
   */
  approvedMethods: readonly string[];

  /**
   * Enrich this chain's CAIP-25 caveat value for the given
   * WalletConnect session proposal before permissions are requested.
   */
  enrichCaveatValue?(args: {
    proposal: ProposalParamsLight;
    caveatValue: Caip25CaveatValue;
  }): Caip25CaveatValue;

  /**
   * Build this chain's namespace slice from the wallet's current state
   * What the wallet is *capable of exposing* for this channel, independent of
   * any dapp proposal.
   */
  getScopedPermissions(args: {
    channelId: string;
  }): Promise<NamespaceConfig | undefined>;

  /**
   * Optional sessionProperties this adapter wants to advertise to the dapp at
   * session approval time. Values returned by every adapter are merged into
   * the `approveSession` call.
   *
   * Return `undefined` when this adapter has nothing to contribute for the
   * given proposal (e.g. the proposal does not reference this namespace).
   */
  getSessionProperties?(args: {
    proposal: ProposalParamsLight;
  }): Record<string, string> | undefined;

  /**
   * Normalize a CAIP chain id from WC into the shape the Snap expects.
   */
  normalizeCaipChainIdInbound?(caipChainId: CaipChainId): CaipChainId;

  /**
   * Normalize a CAIP chain id from the Snap back into the shape WC expects.
   */
  normalizeCaipChainIdOutbound?(caipChainId: CaipChainId): CaipChainId;

  /**
   * Handles a WC request for this adapter's namespace and returns the
   * WalletConnect-shaped result.
   */
  handleRequest(args: AdapterHandleRequestArgs): Promise<unknown>;
}
