/**
 * Shared shapes for non-EVM WalletConnect chain adapters.
 *
 * The multichain folder ONLY hosts non-EVM chains.
 * EVM (eip155) lives in the main WalletConnect
 * code path and never registers an adapter here.
 */

import type { WalletKitTypes } from '@reown/walletkit';

/** A WalletConnect namespace slice as approved on a session. */
export interface NamespaceConfig {
  chains: string[];
  methods: string[];
  events: string[];
  accounts: string[];
}

/**
 * Subset of a WalletConnect v2 session proposal the multichain module needs.
 * Kept structural so adapter tests don't depend on WalletConnect SDK
 * internals.
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

/** A method + params pair passed through request/response mappers. */
export interface MappedRequest {
  method: string;
  params: unknown;
}

/**
 * Single registration point for a non-EVM CAIP-2 namespace. An adapter owns
 * the declarative session configuration (redirect methods), the namespace
 * builder, optional permission seeding, and request/response shape mapping.
 */
export interface NonEvmChainAdapter {
  /** CAIP-2 namespace identifier (e.g. `'tron'`, `'solana'`). */
  readonly namespace: string;

  /**
   * Methods that, once confirmed, should redirect the user back to the
   * originating dapp.
   */
  readonly redirectMethods: string[];

  /**
   * Normalize a CAIP-2 chain ID received from WalletConnect into the form
   * MetaMask uses internally. Return the input unchanged when no
   * normalization is needed.
   */
  normalizeCaipChainId?(caipChainId: string): string;

  /**
   * Build the namespace slice the wallet wants to approve for this chain,
   * or `undefined` if the wallet has nothing to expose for the current
   * proposal.
   */
  buildNamespaceSlice(params: {
    proposal: ProposalLike;
    channelId: string;
  }): NamespaceConfig | undefined;

  /**
   * Optional side effect to run before `approveSession`. Used by chains
   * that need to seed additional permissions (e.g. Tron registers EOAs in
   * the CAIP-25 caveat so downstream code sees them).
   */
  onBeforeApprove?(params: { proposal: ProposalLike; channelId: string }): void;

  /**
   * Translate a WalletConnect request (namespace-prefixed method + dapp
   * params) into the shape expected by the target Snap. Returns the
   * request unchanged when no mapping is required.
   */
  mapRequest?(request: MappedRequest): MappedRequest;

  /**
   * Post-process a Snap result before responding to the dapp via
   * WalletConnect. Returns the Snap result unchanged when no mapping is
   * required.
   */
  mapResponse?(params: {
    method: string;
    params: unknown;
    result: unknown;
  }): unknown;
}

/**
 * Callback surface exposed by the WalletConnect2Session to its routing
 * helpers — kept here so tests can stub the host without depending on the
 * full session.
 */
export interface NonEvmRoutingHost {
  approveRequest: (args: { id: string; result: unknown }) => Promise<void>;
  rejectRequest: (args: { id: string; error: unknown }) => Promise<void>;
}

/** A WalletKit session request as routed through the non-EVM dispatcher. */
export type NonEvmSessionRequest = WalletKitTypes.SessionRequest;
