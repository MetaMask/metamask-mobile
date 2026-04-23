import { ImageSourcePropType, ViewStyle } from 'react-native';

/** Route params accepted by the NetworkDetailsView screen. */
export interface NetworkDetailsViewParams {
  /** RPC URL or network type string – when present, opens in edit mode. */
  network?: string;
  /** Pre-filled values for add mode. */
  prefill?: NetworkPrefill;
  /** Show Popular / Custom tabs when true (default: true). */
  shouldShowPopularNetworks?: boolean;
  /** Pop to wallet after network switch (default: true). */
  shouldNetworkSwitchPopToWallet?: boolean;
  /** Whether this is a custom mainnet override flow. */
  isCustomMainnet?: boolean;
  /** Track RPC update from the network connection banner. */
  trackRpcUpdateFromBanner?: boolean;
}

export interface NetworkPrefill {
  rpcUrl?: string;
  chainId?: string;
  nickname?: string;
  ticker?: string;
  blockExplorerUrl?: string;
}

/** Represents a single RPC endpoint in the form's rpcUrls array. */
export interface RpcEndpoint {
  url: string;
  failoverUrls?: string[];
  name?: string;
  type: string;
}

/** Form field values managed by useNetworkForm. */
export interface NetworkFormState {
  rpcUrl: string | undefined;
  failoverRpcUrls: string[] | undefined;
  rpcName: string | undefined;
  rpcUrlForm: string;
  rpcNameForm: string;
  rpcUrls: RpcEndpoint[];
  blockExplorerUrls: string[];
  selectedRpcEndpointIndex: number;
  blockExplorerUrl: string | undefined;
  blockExplorerUrlForm: string | undefined;
  nickname: string | undefined;
  chainId: string | undefined;
  ticker: string | undefined;
  editable: boolean | undefined;
  addMode: boolean;
}

/** Options when auto-persisting after RPC / block explorer sheet commits. */
export interface UrlSheetPersistOptions {
  /** Skip redundant eth_chainId check (e.g. RPC sheet add after sheet validation). */
  skipChainIdSubmitValidation?: boolean;
}

/**
 * Persists RPC / block explorer sheet mutations to the network store.
 * Return `true` so the sheet applies the local form mutation; return `false` to show an
 * error and leave the form unchanged. Must be a boolean (sync or async) — not `void`, so
 * callers cannot accidentally hit the failure path by omitting a return value.
 */
export type UrlSheetMutationCommittedHandler = (
  committedFormSnapshot?: NetworkFormState,
  persistOptions?: UrlSheetPersistOptions,
) => boolean | Promise<boolean>;

/** Validation warnings displayed under form fields. */
export interface ValidationState {
  warningRpcUrl: string | undefined;
  warningChainId: string | undefined;
  warningSymbol: string | undefined;
  warningName: string | undefined;
  validatedRpcURL: boolean;
  validatedChainId: boolean;
  validatedSymbol: boolean;
}

/** Visibility state for the various modals / sub-forms. */
export interface ModalState {
  showMultiRpcAddModal: boolean;
  rpcModalShowForm: boolean;
  showMultiBlockExplorerAddModal: boolean;
  blockExplorerModalShowForm: boolean;
  showWarningModal: boolean;
}

/** Focus tracking for form fields (drives input border colors). */
export interface FocusState {
  isNameFieldFocused: boolean;
  isSymbolFieldFocused: boolean;
  isRpcUrlFieldFocused: boolean;
  isChainIdFieldFocused: boolean;
}

/** Input style variants based on validation/focus state. */
export type InputStyleVariant = ViewStyle[];

/** Shared image source type. */
export type NetworkImageSource = ImageSourcePropType | undefined;
