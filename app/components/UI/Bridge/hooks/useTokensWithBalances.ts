import { useMemo } from 'react';
import { parseCaipAssetType } from '@metamask/utils';
import { constants } from 'ethers';
import {
  isNonEvmChainId,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../types';
import { PopularToken } from './usePopularTokens';
import { BalancesByAssetId } from './useBalancesByAssetId';

/**
 * Converts API tokens to BridgeTokens with proper address and chainId formatting
 * based on whether the chain is EVM or non-EVM
 */
const convertAPITokensToBridgeTokens = (
  apiTokens: PopularToken[],
): (BridgeToken & { assetId?: string })[] =>
  apiTokens.map((token) => {
    const { assetReference, chainId, assetNamespace } = parseCaipAssetType(
      token.assetId,
    );
    const isNonEvm = isNonEvmChainId(chainId);
    const isNative = assetNamespace === 'slip44';

    // For non-EVM chains, keep the full assetId as the address to properly match balances
    // For EVM native tokens, use the zero address (required by useLatestBalance)
    // For EVM ERC20 tokens, use the asset reference (the actual contract address)
    let address: string;
    if (isNonEvm) {
      address = token.assetId;
    } else if (isNative) {
      address = constants.AddressZero;
    } else {
      address = assetReference;
    }

    // For EVM chains, convert chainId to Hex format for useLatestBalance to work correctly
    // For non-EVM chains, keep CAIP format
    const formattedChainId = isNonEvm ? chainId : formatChainIdToHex(chainId);

    return {
      ...token,
      assetId: token.assetId,
      address,
      chainId: formattedChainId,
    };
  });

/**
 * Merges API tokens with balance data from the selector
 * @param apiTokens - Tokens from the API (popular or search results)
 * @param balancesByAssetId - Balance data indexed by assetId
 * @returns Tokens with merged balance information
 */
export const useTokensWithBalances = (
  apiTokens: PopularToken[],
  balancesByAssetId: BalancesByAssetId,
): BridgeToken[] =>
  useMemo(() => {
    const convertedTokens = convertAPITokensToBridgeTokens(apiTokens);

    return convertedTokens.map((token) => {
      // Normalize assetId because API returns assetId in lowercase for EVM chains
      const normalizedAssetId = isNonEvmChainId(token.chainId)
        ? token.assetId
        : token.assetId?.toLowerCase();
      const balanceData = balancesByAssetId[normalizedAssetId ?? ''];
      if (balanceData) {
        return {
          ...token,
          balance: balanceData.balance,
          balanceFiat: balanceData.balanceFiat,
          tokenFiatAmount: balanceData.tokenFiatAmount,
          currencyExchangeRate: balanceData.currencyExchangeRate,
          accountType: balanceData.accountType,
        };
      }
      return token;
    });
  }, [apiTokens, balancesByAssetId]);
