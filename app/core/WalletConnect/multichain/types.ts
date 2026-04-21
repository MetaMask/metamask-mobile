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
 * Snap request passed to / returned from a chain adapter's request mapper.
 */
export interface SnapMappedRequest {
  method: string;
  params: unknown;
}

/**
 * Single registration point for a CAIP-2 namespace. An adapter owns every
 * chain-specific concern: methods/events, how to build the approved namespace
 * slice, optional pre-approve side effects, and (for non-EVM) how to route
 * requests into a Snap.
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
   * Build the namespace slice the wallet wants to approve for this chain,
   * or `undefined` if the wallet has nothing to expose (e.g. no permitted
   * chains and no fallback accounts).
   */
  buildNamespace(params: {
    proposal: ProposalLike;
    channelId: string;
  }): Promise<NamespaceConfig | undefined>;

  /**
   * Optional side effect to run before `approveSession`. Used by chains that
   * need to seed additional permissions (e.g. Tron registers EOA accounts in
   * CAIP-25 caveats so downstream code sees them alongside EVM).
   */
  onBeforeApprove?(params: {
    proposal: ProposalLike;
    channelId: string;
  }): Promise<void>;

  /** Snap ID used to execute requests for non-EVM chains. */
  readonly snapId?: string;

  /**
   * Map a raw WalletConnect request into the shape expected by the chain's
   * Snap. Returns the input unchanged by default.
   */
  adaptRequest?(request: SnapMappedRequest): SnapMappedRequest;

  /**
   * Post-process a Snap result before the wallet responds to the dapp. Used
   * to re-assemble responses the dapp expects in a legacy shape (e.g. Tron
   * expects the signed transaction mirrored back with a `signature` array).
   * Receives the original (pre-adaptation) WalletConnect method and params.
   */
  adaptResponse?(params: {
    method: string;
    params: unknown;
    result: unknown;
  }): unknown;
}
