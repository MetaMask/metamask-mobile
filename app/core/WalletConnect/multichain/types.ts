/**
 * Shape of one namespace slice in a WalletConnect session. Mirrors
 * `SessionTypes.Namespace` from `@walletconnect/types` but kept as a local
 * type so the multichain module has no hard dependency on a specific WC
 * version.
 */
export interface NamespaceConfig {
  /** CAIP-2 chain IDs (e.g. `['eip155:1', 'tron:0x2b6653dc']`). */
  chains: string[];
  /** JSON-RPC methods supported for this namespace. */
  methods: string[];
  /** Event names the wallet may emit for this namespace. */
  events: string[];
  /** CAIP-10 account strings (e.g. `['eip155:1:0xabc...']`). */
  accounts: string[];
}

/**
 * Subset of a WalletConnect v2 session proposal / active session that the
 * multichain module actually needs. Using a structural type keeps tests and
 * internal call sites decoupled from WalletConnect SDK internals.
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
 * A method + params pair passed through request/response mappers.
 * Used as input/output for {@link RequestMapper} functions.
 */
export interface SnapMappedRequest {
  method: string;
  params: unknown;
}

/**
 * Translates a WalletConnect request (namespace-prefixed method + dapp
 * params) into the shape expected by the target Snap's keyring handler.
 *
 * @param request - The raw WalletConnect method and params.
 * @returns The mapped method and params for the Snap.
 */
export type RequestMapper = (request: SnapMappedRequest) => SnapMappedRequest;

/**
 * Post-processes a Snap result before the wallet responds to the dapp via
 * WalletConnect. Used to re-assemble responses the dapp expects in a
 * specific shape (e.g. Tron expects the signed transaction mirrored back
 * with a `signature` array).
 *
 * @param params - The original WalletConnect method, params, and Snap result.
 * @returns The response to send back to the dapp.
 */
export type ResponseMapper = (params: {
  method: string;
  params: unknown;
  result: unknown;
}) => unknown;

/**
 * Single registration point for a CAIP-2 namespace. An adapter owns the
 * declarative session configuration (methods, events, redirect methods)
 * and the namespace-building / permission-seeding logic needed during
 * session proposal approval.
 *
 * Request/response mapping is handled separately via {@link RequestMapper}
 * and {@link ResponseMapper}, registered in the request-mappers module.
 */
export interface ChainAdapter {
  /** CAIP-2 namespace identifier (e.g. `'eip155'`, `'tron'`). */
  readonly namespace: string;

  /** Methods the wallet supports on this namespace. */
  readonly methods: string[];

  /** Events the wallet may emit on this namespace. */
  readonly events: string[];

  /**
   * Methods that, once confirmed, should redirect the user back to the
   * originating dapp (native deeplink / universal link).
   */
  readonly redirectMethods: string[];

  /**
   * Priority when selecting which namespace's chain to emit `chainChanged`
   * for. Higher values are preferred. Defaults to `0` when omitted.
   *
   * EIP-155 uses `0`; non-EVM adapters that serve chain-specific dapps
   * should use a higher value so their chain is emitted first.
   */
  readonly emissionPriority?: number;

  /**
   * Build the namespace slice the wallet wants to approve for this chain,
   * or `undefined` if the wallet has nothing to expose (e.g. no permitted
   * chains and no fallback accounts).
   *
   * @param params - Contains the proposal and WC channel ID.
   * @returns The namespace config or `undefined`.
   */
  buildNamespace(params: {
    proposal: ProposalLike;
    channelId: string;
  }): Promise<NamespaceConfig | undefined>;

  /**
   * Normalize a CAIP-2 chain ID received from WalletConnect into the format
   * MetaMask uses internally. Called on every inbound request before any
   * routing decision is made.
   *
   * Return the input unchanged if no normalization is needed.
   *
   * @param caipChainId - The raw CAIP-2 chain ID (e.g. `'tron:0x2b6653dc'`).
   * @returns The normalized chain ID (e.g. `'tron:728126428'`).
   */
  normalizeCaipChainId?(caipChainId: string): string;

  /**
   * Optional side effect to run before `approveSession`. Used by chains that
   * need to seed additional permissions (e.g. Tron registers EOA accounts in
   * CAIP-25 caveats so downstream code sees them alongside EVM).
   *
   * @param params - Contains the proposal and WC channel ID.
   */
  onBeforeApprove?(params: {
    proposal: ProposalLike;
    channelId: string;
  }): Promise<void>;

  /**
   * Post-process the full namespaces map after all adapters have built their
   * slices. Used to derive alias namespaces (e.g. EIP-155 mirrors itself
   * under `wallet` for dapps using `wallet:eip155`).
   *
   * Mutates `namespaces` in place.
   */
  onAfterBuildNamespaces?(params: {
    proposal: ProposalLike;
    namespaces: Record<string, NamespaceConfig>;
  }): void;
}
