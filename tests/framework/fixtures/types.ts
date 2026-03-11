// ─── Layer 1: Imported from MetaMask packages (and re-exported) ───────────────
// Imported for use in Layer 3 composed types; re-exported so consumers can
// import controller state types from this single file rather than each package.
import type { NetworkState } from '@metamask/network-controller';
import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { PreferencesState } from '@metamask/preferences-controller';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';

export type {
  NetworkState,
  AccountsControllerState,
  PreferencesState,
  AccountTreeControllerState,
};

// ─── Layer 2: Minimal hand-written interfaces ─────────────────────────────────
// Written for controllers that do not export a clean state type.
// These match the shape used in default-fixture.json. Keep them narrow —
// only include the fields FixtureBuilder methods actually read or write.

export interface KeyringEntry {
  type: string;
  accounts: string[];
  metadata?: { id: string; name: string };
}

export interface KeyringControllerState {
  keyrings: KeyringEntry[];
  vault?: string;
  isUnlocked?: boolean;
  encryptionKey?: string;
  encryptionSalt?: string;
}

// A single caveat inside a permission grant.
export interface PermissionCaveat {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

// One permission granted to an origin.
export interface PermissionEntry {
  id: string;
  parentCapability: string;
  invoker: string;
  caveats: PermissionCaveat[] | null;
  date: number;
}

// A subject (origin) that holds one or more permissions.
export interface PermissionSubject {
  origin: string;
  permissions: Record<string, PermissionEntry>;
}

export interface PermissionControllerState {
  subjects: Record<string, PermissionSubject>;
}

// Snaps controller — only the fields we set in fixtures.
export interface SnapEntry {
  id: string;
  enabled: boolean;
  blocked: boolean;
  status: string;
  version: string;
  // Allow additional snap manifest fields without listing them all.
  [key: string]: unknown;
}

export interface SnapControllerState {
  snaps?: Record<string, SnapEntry>; // absent in default fixture; injected at runtime
}

// Token entry used in TokensController.allTokens
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  image?: string;
  [key: string]: unknown;
}

export interface TokensControllerState {
  // allTokens[chainId][accountAddress] = TokenInfo[]
  allTokens: Record<string, Record<string, TokenInfo[]>>;
}

export interface TokenBalancesControllerState {
  // tokenBalances[accountAddress][chainId][tokenAddress] = hex string
  tokenBalances: Record<string, Record<string, Record<string, string>>>;
}

export interface TokenRatesControllerState {
  // marketData[chainId][tokenAddress] = { tokenAddress, price, ... }
  marketData: Record<string, Record<string, Record<string, unknown>>>;
}

export interface CurrencyRateEntry {
  conversionDate: number;
  conversionRate: number;
  usdConversionRate: number;
}

export interface CurrencyRateControllerState {
  currentCurrency: string;
  currencyRates: Record<string, CurrencyRateEntry>;
}

export interface AccountBalance {
  balance: string;
}

export interface AccountTrackerControllerState {
  accounts?: Record<string, AccountBalance>; // legacy field; absent in current fixture
  accountsByChainId: Record<string, Record<string, AccountBalance>>;
}

export interface RampsRegionCountry {
  isoCode: string;
  name: string;
  flag: string;
  currency?: string;
  phone: { prefix: string; placeholder: string; template: string };
  supported: { buy: boolean; sell: boolean };
}

export interface RampsRegionState {
  country: RampsRegionCountry;
  state: {
    stateId: string;
    name: string;
    supported: { buy: boolean; sell: boolean };
  } | null;
  regionCode: string;
}

export interface RampsControllerState {
  userRegion: RampsRegionState | null;
  [key: string]: unknown;
}

// ─── Redux slice shapes ───────────────────────────────────────────────────────

export interface BrowserTab {
  id: number;
  url: string;
  isArchived?: boolean;
}

export interface BrowserState {
  activeTab: number | null;
  tabs: BrowserTab[];
  history: string[];
  favicons: unknown[];
  isFullscreen: boolean;
  visitedDappsByHostname: Record<string, unknown>;
  whitelist: string[];
}

export interface UserState {
  seedphraseBackedUp: boolean;
  backUpSeedphraseVisible: boolean;
  passwordSet: boolean;
  importTime?: number;
  musdConversionEducationSeen?: boolean;
  [key: string]: unknown;
}

export interface FiatOrdersState {
  orders: unknown[];
  customOrderIds: unknown[];
  selectedRegionAgg?: unknown;
  selectedPaymentMethodAgg?: string;
  detectedGeolocation?: string;
  rampRoutingDecision?: string;
  networks?: unknown[];
  [key: string]: unknown;
}

export interface LegalNoticesState {
  newPrivacyPolicyToastShownDate: number;
  isPna25Acknowledged?: boolean;
  [key: string]: unknown;
}

// ─── Layer 3: Composed types ──────────────────────────────────────────────────

export interface EngineBackgroundState {
  NetworkController: NetworkState;
  AccountsController: AccountsControllerState;
  PreferencesController: PreferencesState;
  AccountTreeController: AccountTreeControllerState;
  KeyringController: KeyringControllerState;
  PermissionController: PermissionControllerState;
  SnapController: SnapControllerState;
  TokensController: TokensControllerState;
  TokenBalancesController: TokenBalancesControllerState;
  TokenRatesController: TokenRatesControllerState;
  CurrencyRateController: CurrencyRateControllerState;
  AccountTrackerController: AccountTrackerControllerState;
  RampsController: RampsControllerState;
  // PerpsController has an exotic shape that changes frequently; keep loose.
  PerpsController: Record<string, unknown>;
  // Allow other controllers that fixtures may optionally set.
  [key: string]: unknown;
}

export interface FixtureState {
  engine: { backgroundState: EngineBackgroundState };
  browser: BrowserState;
  user: UserState;
  fiatOrders: FiatOrdersState;
  legalNotices: LegalNoticesState;
  // Other Redux slices we don't need to narrow further.
  [key: string]: unknown;
}

export interface Fixture {
  state: FixtureState;
  asyncState: Record<string, string>;
}

// ─── Method parameter types ───────────────────────────────────────────────────

/**
 * The network provider config passed to withNetworkController().
 * Matches the shape of providerConfig objects in tests/resources/networks.e2e.js.
 */
export interface ProviderConfig {
  chainId: string;
  rpcUrl: string;
  type: string;
  nickname?: string;
  ticker?: string;
}

/**
 * Shape of user-profile objects exported from profile fixtures.
 * Used by withUserProfileKeyRing().
 */
export interface UserKeyringState {
  KEYRING_CONTROLLER_STATE: Partial<KeyringControllerState>;
}

/**
 * Shape of user-profile objects containing snap controller state.
 * Used by withUserProfileSnapUnencryptedState().
 */
export interface UserSnapState {
  SNAPS_CONTROLLER_STATE: Partial<SnapControllerState>;
}

/**
 * Shape of user-profile objects containing permission controller state.
 * Used by withUserProfileSnapPermissions().
 */
export interface UserPermissionState {
  PERMISSION_CONTROLLER_STATE: Partial<PermissionControllerState>;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
