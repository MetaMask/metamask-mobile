import type { Hex } from '@metamask/utils';
import type { BigNumber } from 'bignumber.js';
import { AssetType } from '../SimulationDetails/types';

export interface ChainConfiguration {
  isActiveSrc: boolean;
  isActiveDest: boolean;
}

export interface L1GasFees {
  l1GasFeesInHexWei?: string; // l1 fees for approval and trade in hex wei, appended by controller
}
// Values derived from the quote response
// valueInCurrency values are calculated based on the user's selected currency
export interface TokenAmountValues {
  amount: BigNumber;
  valueInCurrency: BigNumber | null;
  usd: BigNumber | null;
}
export interface QuoteMetadata {
  gasFee: TokenAmountValues;
  totalNetworkFee: TokenAmountValues; // estimatedGasFees + relayerFees
  totalMaxNetworkFee: TokenAmountValues; // maxGasFees + relayerFees
  toTokenAmount: TokenAmountValues; // destTokenAmount
  adjustedReturn: Omit<TokenAmountValues, 'amount'>; // destTokenAmount - totalNetworkFee
  sentAmount: TokenAmountValues; // srcTokenAmount + metabridgeFee
  swapRate: BigNumber; // destTokenAmount / sentAmount
  cost: Omit<TokenAmountValues, 'amount'>; // sentAmount - adjustedReturn
}
// Sort order set by the user

export enum SortOrder {
  COST_ASC = 'cost_ascending',
  ETA_ASC = 'time_descending',
}

export type BridgeToken = {
  type: AssetType.Native | AssetType.ERC20;
  address: string;
  symbol: string;
  image: string;
  decimals: number;
  chainId: Hex;
  balance: string; // raw balance
  string: string | undefined; // normalized balance as a stringified number
  tokenFiatAmount?: number | null;
} | null;
// Types copied from Metabridge API

export enum BridgeFlag {
  EXTENSION_CONFIG = 'extension-config',
}
export type GasMultiplierByChainId = Record<string, number>;

export interface FeatureFlagResponse {
  [BridgeFlag.EXTENSION_CONFIG]: {
    refreshRate: number;
    maxRefreshCount: number;
    support: boolean;
    chains: Record<number, ChainConfiguration>;
  };
}

export interface BridgeAsset {
  chainId: ChainId;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export interface QuoteRequest {
  walletAddress: string;
  destWalletAddress?: string;
  srcChainId: ChainId;
  destChainId: ChainId;
  srcTokenAddress: string;
  destTokenAddress: string;
  srcTokenAmount: string; // This is the amount sent
  slippage: number;
  aggIds?: string[];
  bridgeIds?: string[];
  insufficientBal?: boolean;
  resetApproval?: boolean;
  refuel?: boolean;
}
interface Protocol {
  name: string;
  displayName?: string;
  icon?: string;
}
enum ActionTypes {
  BRIDGE = 'bridge',
  SWAP = 'swap',
  REFUEL = 'refuel',
}
interface Step {
  action: ActionTypes;
  srcChainId: ChainId;
  destChainId?: ChainId;
  srcAsset: BridgeAsset;
  destAsset: BridgeAsset;
  srcAmount: string;
  destAmount: string;
  protocol: Protocol;
}
type RefuelData = Step;

export interface Quote {
  requestId: string;
  srcChainId: ChainId;
  srcAsset: BridgeAsset;
  // Some tokens have a fee of 0, so sometimes it's equal to amount sent
  srcTokenAmount: string; // Atomic amount, the amount sent - fees
  destChainId: ChainId;
  destAsset: BridgeAsset;
  destTokenAmount: string; // Atomic amount, the amount received
  feeData: Record<FeeType.METABRIDGE, FeeData> &
    Partial<Record<FeeType, FeeData>>;
  bridgeId: string;
  bridges: string[];
  steps: Step[];
  refuel?: RefuelData;
}

export interface QuoteResponse {
  quote: Quote;
  approval?: TxData | null;
  trade: TxData;
  estimatedProcessingTimeInSeconds: number;
}

export enum ChainId {
  ETH = 1,
  OPTIMISM = 10,
  BSC = 56,
  POLYGON = 137,
  ZKSYNC = 324,
  BASE = 8453,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
  LINEA = 59144,
}

export enum FeeType {
  METABRIDGE = 'metabridge',
  REFUEL = 'refuel',
}
export interface FeeData {
  amount: string;
  asset: BridgeAsset;
}
export interface TxData {
  chainId: ChainId;
  to: string;
  from: string;
  value: string;
  data: string;
  gasLimit: number | null;
}
export enum BridgeFeatureFlagsKey {
  EXTENSION_CONFIG = 'extensionConfig',
}

export interface BridgeFeatureFlags {
  [BridgeFeatureFlagsKey.EXTENSION_CONFIG]: {
    refreshRate: number;
    maxRefreshCount: number;
    support: boolean;
    chains: Record<Hex, ChainConfiguration>;
  };
}
export enum RequestStatus {
  LOADING,
  FETCHED,
  ERROR,
}
export enum BridgeUserAction {
  SELECT_DEST_NETWORK = 'selectDestNetwork',
  UPDATE_QUOTE_PARAMS = 'updateBridgeQuoteRequestParams',
}
export enum BridgeBackgroundAction {
  SET_FEATURE_FLAGS = 'setBridgeFeatureFlags',
  RESET_STATE = 'resetState',
  GET_BRIDGE_ERC20_ALLOWANCE = 'getBridgeERC20Allowance',
}
export interface BridgeState {
  bridgeFeatureFlags: BridgeFeatureFlags;
  quoteRequest: Partial<QuoteRequest>;
  quotes: (QuoteResponse & L1GasFees)[];
  quotesInitialLoadTime?: number;
  quotesLastFetched?: number;
  quotesLoadingStatus?: RequestStatus;
  quoteFetchError?: string;
  quotesRefreshCount: number;
}

export interface BridgeControllerState {
  bridgeState: BridgeState;
}
