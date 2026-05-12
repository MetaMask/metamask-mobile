/**
 * Shared types for the WalletConnect non-EVM (multichain) adapter layer.
 *
 * Each non-EVM chain (Tron today, Solana / Bitcoin tomorrow) ships a
 * `ChainAdapter` that knows how to:
 * - detect interest in a dapp proposal,
 * - seed the CAIP-25 caveat with this chain's accounts,
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
 * Minimal shape of a WalletConnect session proposal — kept loose so
 * adapters don't depend on `@walletconnect/types` directly.
 */
export interface ProposalLike {
  requiredNamespaces?: Record<
    string,
    { chains?: string[]; methods?: string[]; events?: string[] } | undefined
  >;
  optionalNamespaces?: Record<
    string,
    { chains?: string[]; methods?: string[]; events?: string[] } | undefined
  >;
}

/**
 * Inputs handed to `ChainAdapter.buildNamespace`. The optional
 * `existing*` fields surface previously-approved values so the adapter
 * can preserve user intent (e.g. existing accounts from scoped
 * permissions, methods/events from an in-flight session).
 */
export interface BuildNamespaceArgs {
  proposal: ProposalLike;
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
   * Returns true if the dapp proposal references this namespace,
   * either via a top-level `<namespace>` key or via a bare
   * `<namespace>:<ref>` chain id under another namespace.
   */
  proposalReferencesNamespace(proposal: ProposalLike): boolean;

  /**
   * Optional pre-approval hook. Called once per session proposal,
   * regardless of whether the proposal references this namespace —
   * adapters that only want to react when interest is shown must
   * call `proposalReferencesNamespace` themselves.
   */
  onBeforeApprove?(args: {
    proposal: ProposalLike;
    channelId: string;
  }): void | Promise<void>;

  /**
   * Build this chain's namespace slice from the wallet's current state
   * What the wallet is *capable of exposing* for this channel, independent of
   * any dapp proposal.
   */
  buildScopedPermissionsNamespace({
    channelId,
    permittedChains,
  }: {
    channelId: string;
    permittedChains: CaipChainId[];
  }): NamespaceConfig | undefined;

  /**
   * Build this chain's namespace slice for the WC session. Return
   * `undefined` to skip (e.g. proposal doesn't reference us, or no
   * accounts available).
   */
  buildNamespace(args: BuildNamespaceArgs): NamespaceConfig | undefined;

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
