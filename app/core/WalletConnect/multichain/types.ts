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
 * Pairing of `params` and `response` for one JSON-RPC method in a spec.
 */
interface RpcMethodSpec {
  params: unknown;
  response: unknown;
}

/**
 * Static JSON-RPC method specification: a map of method name to its
 * `params`/`response` pairing.
 *
 * Self-referential (`Record<keyof Spec, ...>`) so concrete specs can be plain
 * interfaces, which have no string index signature. Used bare, `RpcSpec` is
 * the type-erased spec accepting any method name.
 */
export type RpcSpec<Spec = Record<string, RpcMethodSpec>> = Record<
  keyof Spec,
  RpcMethodSpec
>;

/**
 * Runtime JSON-RPC method names derived from a method spec.
 */
export type RpcMethod<Spec extends RpcSpec<Spec>> = keyof Spec & string;

/**
 * Runtime JSON-RPC request derived from a method spec.
 */
export type RpcRequest<
  Spec extends RpcSpec<Spec>,
  Method extends RpcMethod<Spec> = RpcMethod<Spec>,
> =
  Method extends RpcMethod<Spec>
    ? { method: Method; params: Spec[Method]['params'] }
    : never;

/**
 * WalletConnect-shaped response paired with a method in the spec. Defaults to
 * the union of every response in the spec.
 */
export type RpcResponse<
  Spec extends RpcSpec<Spec>,
  Method extends RpcMethod<Spec> = RpcMethod<Spec>,
> = Spec[Method]['response'];

/**
 * Fixed context fields every adapter receives alongside the request.
 */
interface AdapterRequestContext {
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
  requestId: number;
}

/**
 * Arguments passed to a chain adapter's `handleRequest` method.
 */
export type AdapterHandleRequestArgs<Spec extends RpcSpec<Spec> = RpcSpec> =
  RpcRequest<Spec> extends infer Request
    ? Request extends unknown
      ? AdapterRequestContext & Request
      : never
    : never;

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
export interface ChainAdapter<
  CaipNamespace extends KnownCaipNamespace = KnownCaipNamespace,
  Spec extends RpcSpec<Spec> = RpcSpec,
> {
  /**
   * CAIP-2 namespace this adapter handles (`'tron'`, `'solana'`, ...).
   */
  namespace: CaipNamespace;

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
  handleRequest(
    args: AdapterHandleRequestArgs<Spec>,
  ): Promise<RpcResponse<Spec>>;
}

/**
 * Type-erased `ChainAdapter` view used by the registry.
 */
export interface AnyChainAdapter extends Omit<ChainAdapter, 'handleRequest'> {
  handleRequest(args: AdapterHandleRequestArgs): Promise<unknown>;
}
