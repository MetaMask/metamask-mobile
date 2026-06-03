/**
 * Host dependency boundary for the vendored activity adapters.
 * TODO: Move this contract into @metamask/activity-adapters when published.
 */
import {
  BRIDGE_CHAINID_COMMON_TOKEN_PAIR,
  IN_PROGRESS_TRANSACTION_STATUSES,
  NATIVE_TOKEN_ADDRESS,
  STATIC_MAINNET_TOKEN_LIST,
  SWAPS_WRAPPED_TOKENS_ADDRESSES,
  SmartTransactionStatus,
  TOKEN_TRANSFER_LOG_TOPIC_HASH,
  TransactionGroupStatus,
  equalsIgnoreCase,
  parseStandardTokenTransactionData,
  toAssetId,
} from './shims';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';

export interface ActivityTokenMetadata {
  symbol?: string;
  decimals?: number;
  assetId?: string;
}

export interface ParsedStandardTokenTransactionData {
  args?: Record<string, unknown>;
}

export interface ActivityAdapterEnvironment {
  bridgeChainIdCommonTokenPair: Record<
    string,
    ActivityTokenMetadata | undefined
  >;
  equalsIgnoreCase: (value?: string, other?: string) => boolean;
  getNativeAssetForChainId: (
    chainId: string,
  ) => ActivityTokenMetadata | undefined;
  inProgressTransactionStatuses: readonly string[];
  nativeTokenAddress: string;
  parseStandardTokenTransactionData: (
    data: string,
  ) => ParsedStandardTokenTransactionData | undefined;
  smartTransactionStatus: {
    cancelled: string;
    pending: string;
    success: string;
  };
  staticMainnetTokenList: Record<string, ActivityTokenMetadata>;
  tokenTransferLogTopicHash: string;
  toAssetId: (
    address: string,
    chainId: string | undefined,
  ) => string | undefined;
  transactionGroupStatus: {
    cancelled: string;
    pending: string;
  };
  wrappedTokenAddresses: Record<string, string>;
}

export const mobileActivityAdapterEnvironment: ActivityAdapterEnvironment = {
  bridgeChainIdCommonTokenPair: BRIDGE_CHAINID_COMMON_TOKEN_PAIR,
  equalsIgnoreCase,
  getNativeAssetForChainId: (chainId) => {
    try {
      return getNativeAssetForChainId(chainId);
    } catch {
      return undefined;
    }
  },
  inProgressTransactionStatuses: IN_PROGRESS_TRANSACTION_STATUSES,
  nativeTokenAddress: NATIVE_TOKEN_ADDRESS,
  parseStandardTokenTransactionData,
  smartTransactionStatus: SmartTransactionStatus,
  staticMainnetTokenList: STATIC_MAINNET_TOKEN_LIST,
  tokenTransferLogTopicHash: TOKEN_TRANSFER_LOG_TOPIC_HASH,
  toAssetId,
  transactionGroupStatus: TransactionGroupStatus,
  wrappedTokenAddresses: SWAPS_WRAPPED_TOKENS_ADDRESSES,
};
