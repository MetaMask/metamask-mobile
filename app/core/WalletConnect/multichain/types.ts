/**
 * Shared types for the WalletConnect non-EVM adapter layer. Each chain ships
 * a `ChainAdapter` that the WC2 session classes call through `./helpers` and
 * `./registry`, so the session code never imports a specific chain.
 */
import type {
  CaipChainId,
  KnownCaipNamespace,
  CaipAccountId,
} from '@metamask/utils';
import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import { type WalletKitTypes } from '@reown/walletkit';

/**
 * A namespace slice in WalletConnect's approved namespaces map.
 */
export interface NamespaceConfig {
  chains: CaipChainId[];
  methods: string[];
  events: string[];
  accounts: CaipAccountId[];
}

/**
 * Snap-shaped request after WC method translation.
 */
export interface SnapMappedRequest<Param = unknown> {
  method: string;
  params: Param;
}

/**
 * Arguments passed to a chain adapter's `handleRequest` method.
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
 * Minimal shape of a WalletConnect session proposal.
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
  /**
   * CAIP-2 namespace this adapter handles (`'tron'`, `'solana'`, ...).
   */
  namespace: KnownCaipNamespace;

  /**
   * Methods that should redirect the user back to the dapp after handling.
   */
  redirectMethods: readonly string[];

  /**
   * Methods this adapter accepts in approved WC sessions.
   */
  approvedMethods: readonly string[];

  /**
   * Mutate the CAIP-25 caveat before the permission request is persisted.
   */
  enrichCaveatValue?(args: {
    proposal: ProposalParamsLight;
    caveatValue: Caip25CaveatValue;
  }): Caip25CaveatValue;

  /**
   * Namespace slice the wallet is willing to expose for this channel,
   * independent of any dapp proposal.
   */
  getScopedPermissions(args: {
    channelId: string;
  }): Promise<NamespaceConfig | undefined>;

  /**
   * Optional sessionProperties merged into `approveSession`. Return
   * `undefined` when the proposal does not reference this namespace.
   */
  getSessionProperties?(args: {
    proposal: ProposalParamsLight;
  }): Record<string, string> | undefined;

  /**
   * Convert an inbound CAIP chain id into the form the Snap expects.
   */
  normalizeCaipChainIdInbound?(caipChainId: CaipChainId): CaipChainId;

  /**
   * Convert an outbound CAIP chain id into the form WC expects.
   */
  normalizeCaipChainIdOutbound?(caipChainId: CaipChainId): CaipChainId;

  /**
   * Handle a WC request and return its WalletConnect-shaped result.
   */
  handleRequest(args: AdapterHandleRequestArgs): Promise<unknown>;
}
