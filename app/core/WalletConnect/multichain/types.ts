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
 * the helpers in `./namespaces` and `./index`.
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
 * Minimal shape of a WalletConnect session proposal
 */
export type ProposalParamsLight = Pick<
  WalletKitTypes.SessionProposal['params'],
  'optionalNamespaces' | 'requiredNamespaces'
>;

/**
 * Inputs handed to `ChainAdapter.buildNamespace`. The optional
 * `existing*` fields surface previously-approved values so the adapter
 * can preserve user intent (e.g. existing accounts from scoped
 * permissions, methods/events from an in-flight session).
 */
export interface BuildNamespaceArgs {
  proposal: ProposalParamsLight;
  existingAccounts?: string[];
  existingMethods?: string[];
  existingEvents?: string[];
}

/**
 * Map of approved namespaces for a WalletConnect session.
 */
export type ApprovedNamespaces = Partial<
  Record<KnownCaipNamespace, NamespaceConfig>
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
   * Normalize a CAIP chain id from WC into the shape the Snap expects.
   */
  normalizeCaipChainIdInbound?(caipChainId: CaipChainId): CaipChainId;

  /**
   * Normalize a CAIP chain id from the Snap back into the shape WC expects.
   */
  normalizeCaipChainIdOutbound?(caipChainId: CaipChainId): CaipChainId;

  /** Maps a WC-shaped request into the Snap's expected shape. */
  mapRequestInbound(args: {
    method: string;
    params: unknown;
  }): SnapMappedRequest;

  /** Normalizes the Snap's response back into what dapps expect. */
  mapRequestOutbound(args: {
    method: string;
    params: unknown;
    result: unknown;
  }): unknown;
}
