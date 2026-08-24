/**
 * Host dependency boundary for the vendored activity adapters.
 * TODO: Move this contract into @metamask/activity-adapters when published.
 */
import {
  BRIDGE_CHAINID_COMMON_TOKEN_PAIR,
  IN_PROGRESS_TRANSACTION_STATUSES,
  NATIVE_TOKEN_ADDRESS,
  STATIC_MAINNET_TOKEN_LIST,
  SmartTransactionStatus,
  TransactionGroupStatus,
  equalsIgnoreCase,
  parseStandardTokenTransactionData,
  toAssetId,
} from './shims';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import ReduxService from '../../../core/redux';
import {
  findKnownTokenDecimals,
  type TokenDecimalsLookupState,
} from './token-decimals-lookup';

export interface ActivityTokenMetadata {
  symbol?: string;
  decimals?: number;
  assetId?: string;
}

interface ParsedStandardTokenTransactionData {
  args?: Record<string, unknown>;
}

export interface ActivityAdapterEnvironment {
  bridgeChainIdCommonTokenPair: Record<
    string,
    ActivityTokenMetadata | undefined
  >;
  equalsIgnoreCase: (value?: string, other?: string) => boolean;
  /**
   * Resolves a token's decimals from host state (imported/detected tokens)
   * when the data source omits them. Accepts CAIP-2 or hex chain ids. Mobile
   * delta — upstream with the shared adapters package.
   */
  getKnownTokenDecimals?: (
    chainId: string,
    contractAddress: string,
  ) => number | undefined;
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
  toAssetId: (
    address: string,
    chainId: string | undefined,
  ) => string | undefined;
  transactionGroupStatus: {
    cancelled: string;
    pending: string;
  };
}

export const mobileActivityAdapterEnvironment: ActivityAdapterEnvironment = {
  bridgeChainIdCommonTokenPair: BRIDGE_CHAINID_COMMON_TOKEN_PAIR,
  equalsIgnoreCase,
  getKnownTokenDecimals: (chainId, contractAddress) => {
    try {
      const tokensState = ReduxService.store.getState().engine.backgroundState
        .TokensController as TokenDecimalsLookupState;
      return findKnownTokenDecimals(tokensState, chainId, contractAddress);
    } catch {
      // Store not initialized (unit tests, early startup).
      return undefined;
    }
  },
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
  toAssetId,
  transactionGroupStatus: TransactionGroupStatus,
};
