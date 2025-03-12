import type { CaipChainId } from '@metamask/utils';

export type BridgeToken = {
  address: string;
  symbol: string;
  image: string;
  decimals: number;
  chainId: CaipChainId;
};

export interface BridgeAsset {
  chainId: ChainId;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
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

// TODO: use type from @metamask/bridge-controller once "approval" is made optional
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