import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { swapsUtils } from '@metamask/swaps-controller';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { Hex } from '@metamask/utils';
import { RouteProp } from '@react-navigation/native';

const {
  ETH_CHAIN_ID,
  BSC_CHAIN_ID,
  SWAPS_TESTNET_CHAIN_ID,
  POLYGON_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  LINEA_CHAIN_ID,
  BASE_CHAIN_ID,
} = swapsUtils;

const allowedChainIds: Hex[] = [
  ETH_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  LINEA_CHAIN_ID,
  BASE_CHAIN_ID,
  SWAPS_TESTNET_CHAIN_ID,
];

export const allowedTestnetChainIds: Hex[] = [
  NETWORKS_CHAIN_ID.GOERLI,
  NETWORKS_CHAIN_ID.SEPOLIA,
];

if (__DEV__) {
  allowedChainIds.push(...allowedTestnetChainIds);
}

export function isSwapsAllowed(chainId: Hex): boolean {
  if (!AppConstants.SWAPS.ACTIVE) {
    return false;
  }
  if (!AppConstants.SWAPS.ONLY_MAINNET) {
    allowedChainIds.push(SWAPS_TESTNET_CHAIN_ID);
  }
  return allowedChainIds.includes(chainId);
}

// Placeholder type for Token
// Note: maybe should this be SwapsToken, but aggregators is missing from SwapsToken

export interface Token {
  symbol: string;
  decimals: number;
  address: string;
  occurrences: number;
  aggregators: string[];
}

export function isSwapsNativeAsset(token: Token | undefined): boolean {
  return !!token && token.address === swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS;
}

export function isDynamicToken(token: Token | undefined): boolean {
  return (
    !!token &&
    token.occurrences === 1 &&
    token?.aggregators?.length === 1 &&
    token.aggregators[0] === 'dynamic'
  );
}

interface QuotesNavigationParams {
  sourceTokenAddress: string;
  destinationTokenAddress: string;
  sourceAmount: string;
  slippage: number;
  tokens: Token[];
}

/**
 * Sets required parameters for Swaps Quotes View
 */
export function setQuotesNavigationsParams(
  sourceTokenAddress: string,
  destinationTokenAddress: string,
  sourceAmount: string,
  slippage: number,
  tokens: Token[] = [],
): QuotesNavigationParams {
  return {
    sourceTokenAddress,
    destinationTokenAddress,
    sourceAmount,
    slippage,
    tokens,
  };
}

/**
 * Gets required parameters for Swaps Quotes View
 */
export function getQuotesNavigationsParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: RouteProp<any, any>,
): QuotesNavigationParams {
  const slippage = route.params?.slippage ?? 1;
  const sourceTokenAddress = route.params?.sourceTokenAddress ?? '';
  const destinationTokenAddress = route.params?.destinationTokenAddress ?? '';
  const sourceAmount = route.params?.sourceAmount;
  const tokens = route.params?.tokens;

  return {
    sourceTokenAddress,
    destinationTokenAddress,
    sourceAmount,
    slippage,
    tokens,
  };
}

interface FetchParams {
  slippage: number;
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
  walletAddress: string;
  metaData: {
    sourceTokenInfo: Token;
    destinationTokenInfo: Token;
  };
}

/**
 * Returns object required to startFetchAndSetQuotes
 * */
export function getFetchParams({
  slippage = 1,
  sourceToken,
  destinationToken,
  sourceAmount,
  walletAddress,
}: {
  slippage?: number;
  sourceToken: Token;
  destinationToken: Token;
  sourceAmount: string;
  walletAddress: string;
}): FetchParams {
  return {
    slippage,
    sourceToken: sourceToken.address,
    destinationToken: destinationToken.address,
    sourceAmount,
    walletAddress,
    metaData: {
      sourceTokenInfo: sourceToken,
      destinationTokenInfo: destinationToken,
    },
  };
}

export function useRatio(
  numeratorAmount: string,
  numeratorDecimals: number,
  denominatorAmount: string,
  denominatorDecimals: number,
): BigNumber {
  const ratio = useMemo(
    () =>
      new BigNumber(numeratorAmount)
        .dividedBy(denominatorAmount)
        .multipliedBy(
          new BigNumber(10).pow(denominatorDecimals - numeratorDecimals),
        ),
    [
      denominatorAmount,
      denominatorDecimals,
      numeratorAmount,
      numeratorDecimals,
    ],
  );

  return ratio;
}

export function getErrorMessage(errorKey: string): [string, string, string] {
  const { SwapsError } = swapsUtils;
  const errorAction =
    errorKey === SwapsError.QUOTES_EXPIRED_ERROR
      ? strings('swaps.get_new_quotes')
      : strings('swaps.try_again');
  switch (errorKey) {
    case SwapsError.QUOTES_EXPIRED_ERROR: {
      return [
        strings('swaps.quotes_timeout'),
        strings('swaps.request_new_quotes'),
        errorAction,
      ];
    }
    case SwapsError.QUOTES_NOT_AVAILABLE_ERROR: {
      return [
        strings('swaps.quotes_not_available'),
        strings('swaps.try_adjusting'),
        errorAction,
      ];
    }
    default: {
      return [
        strings('swaps.error_fetching_quote'),
        strings('swaps.unexpected_error', {
          error: errorKey || 'error-not-provided',
        }),
        errorAction,
      ];
    }
  }
}

export function getQuotesSourceMessage(type: string): [string, string, string] {
  switch (type) {
    case 'DEX': {
      return [
        strings('swaps.quote_source_dex.1'),
        strings('swaps.quote_source_dex.2'),
        strings('swaps.quote_source_dex.3'),
      ];
    }
    case 'RFQ': {
      return [
        strings('swaps.quote_source_rfq.1'),
        strings('swaps.quote_source_rfq.2'),
        strings('swaps.quote_source_rfq.3'),
      ];
    }
    case 'CONTRACT':
    case 'CNT': {
      return [
        strings('swaps.quote_source_cnt.1'),
        strings('swaps.quote_source_cnt.2'),
        strings('swaps.quote_source_cnt.3'),
      ];
    }
    case 'AGG':
    default: {
      return [
        strings('swaps.quote_source_agg.1'),
        strings('swaps.quote_source_agg.2'),
        strings('swaps.quote_source_agg.3'),
      ];
    }
  }
}
