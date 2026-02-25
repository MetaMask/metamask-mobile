import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import {
  AllowanceState,
  CardTokenAllowance,
  CardStateWarning,
  CardExternalWalletDetail,
} from '../types';
import { CaipChainId, Hex } from '@metamask/utils';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import BigNumber from 'bignumber.js';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { CardSDK } from '../sdk/CardSDK';
import {
  ARBITRARY_ALLOWANCE,
  UNAUTHENTICATED_CACHE_DURATION,
} from '../constants';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import Engine from '../../../../core/Engine';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import {
  isSolanaChainId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { cardKeys } from '../queries';

/**
 * Fetches token allowances from the Card SDK and maps them to CardTokenAllowance objects.
 */
const fetchAllowances = async (
  sdk: CardSDK,
  selectedAddress: string,
  chainId: string,
) => {
  try {
    trace({
      name: TraceName.Card,
      op: TraceOperation.CardGetSupportedTokensAllowances,
    });
    const supportedTokensAllowances =
      await sdk.getSupportedTokensAllowances(selectedAddress);

    const supportedTokens = sdk.getSupportedTokensByChainId();

    const mappedAllowances = supportedTokensAllowances.map((token) => {
      const tokenInfo = supportedTokens.find(
        (supportedToken) => supportedToken.address === token.address,
      );
      const allowance = token.usAllowance.isZero()
        ? token.globalAllowance
        : token.usAllowance;
      let allowanceState;

      if (allowance.isZero()) {
        allowanceState = AllowanceState.NotEnabled;
      } else if (allowance.lt(ARBITRARY_ALLOWANCE)) {
        allowanceState = AllowanceState.Limited;
      } else {
        allowanceState = AllowanceState.Enabled;
      }

      if (!tokenInfo) {
        return null;
      }

      return {
        allowanceState,
        address: token.address,
        tag: allowanceState,
        isStaked: false,
        decimals: tokenInfo.decimals ?? null,
        name: tokenInfo.name ?? null,
        symbol: tokenInfo.symbol ?? null,
        allowance: allowance.toString(),
        caipChainId: chainId,
      };
    });

    const filteredAllowances = mappedAllowances.filter(
      Boolean,
    ) as CardTokenAllowance[];

    endTrace({
      name: TraceName.Card,
    });

    return filteredAllowances;
  } catch (error) {
    Logger.error(
      error as Error,
      'fetchAllowances::Failed to fetch token allowances',
    );
    throw new Error('Failed to fetch token allowances');
  }
};

const filterNonZeroAllowances = (
  allowances: CardTokenAllowance[],
): CardTokenAllowance[] =>
  allowances.filter(({ allowance }) => parseFloat(allowance) > 0);

const findFirstAllowanceWithPositiveBalance = (
  allowances: CardTokenAllowance[],
  balances: Record<Hex, string>,
): CardTokenAllowance | undefined =>
  allowances.find(
    ({ allowance, address: tokenAddress }) =>
      parseFloat(allowance) > 0 &&
      balances[tokenAddress as Hex] &&
      BigNumber(balances[tokenAddress as Hex]).gt(0),
  );

interface OnChainPriorityTokenResult {
  priorityToken: CardTokenAllowance | null;
  allTokensWithAllowances: CardTokenAllowance[];
}

/**
 * React hook to fetch and determine the priority card token for a given user address.
 *
 * Authenticated mode: derives priority token from externalWalletDetailsData (no query).
 * Unauthenticated mode: uses React Query to fetch on-chain allowances and determine priority.
 */
export const useGetPriorityCardToken = (
  externalWalletDetailsData?: {
    walletDetails?: CardExternalWalletDetail[];
    mappedWalletDetails?: CardTokenAllowance[];
    priorityWalletDetail?: CardTokenAllowance | null;
  } | null,
) => {
  const { TokensController, NetworkController } = Engine.context;
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk } = useCardSDK();
  const [isLoadingAddToken, setIsLoadingAddToken] = useState(false);

  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;
  const allTokenBalances = useSelector(selectAllTokenBalances);

  const getBalancesForChain = useCallback(
    (tokenChainId: CaipChainId): Record<Hex, string> =>
      allTokenBalances?.[selectedAddress?.toLowerCase() as Hex]?.[
        safeFormatChainIdToHex(tokenChainId) as `0x${string}`
      ] ?? {},
    [allTokenBalances, selectedAddress],
  );

  // --- Unauthenticated on-chain query ---
  const {
    data: onChainData,
    isLoading: isLoadingOnChain,
    error: onChainError,
    refetch: refetchOnChain,
  } = useQuery<OnChainPriorityTokenResult>({
    queryKey: cardKeys.priorityTokenOnChain(selectedAddress ?? ''),
    queryFn: async (): Promise<OnChainPriorityTokenResult> => {
      if (!sdk || !selectedAddress) {
        throw new Error('SDK or selectedAddress not available');
      }

      trace({
        name: TraceName.Card,
        op: TraceOperation.CardGetPriorityToken,
      });

      const cardTokenAllowances = await fetchAllowances(
        sdk,
        selectedAddress,
        formatChainIdToCaip(CHAIN_IDS.LINEA_MAINNET),
      );

      endTrace({ name: TraceName.Card });

      if (!cardTokenAllowances || cardTokenAllowances.length === 0) {
        const supportedTokens = sdk.getSupportedTokensByChainId();

        if (supportedTokens[0]) {
          const fallbackToken = {
            ...supportedTokens[0],
            allowanceState: AllowanceState.NotEnabled,
            isStaked: false,
            caipChainId: formatChainIdToCaip(CHAIN_IDS.LINEA_MAINNET),
            allowance: '0',
          } as CardTokenAllowance;

          return {
            priorityToken: fallbackToken,
            allTokensWithAllowances: [],
          };
        }

        return { priorityToken: null, allTokensWithAllowances: [] };
      }

      const validAllowances = filterNonZeroAllowances(cardTokenAllowances);

      if (validAllowances.length === 0) {
        return {
          priorityToken: cardTokenAllowances[0] || null,
          allTokensWithAllowances: cardTokenAllowances,
        };
      }

      const validTokenAddresses = validAllowances.map(({ address }) => address);
      const suggestedPriorityToken = await sdk.getPriorityToken(
        selectedAddress,
        validTokenAddresses as string[],
      );

      const matchingAllowance = suggestedPriorityToken
        ? validAllowances.find(
            ({ address }) =>
              address?.toLowerCase() ===
              suggestedPriorityToken.address?.toLowerCase(),
          )
        : undefined;

      let finalToken: CardTokenAllowance | null = null;

      if (matchingAllowance) {
        const chainBalances = getBalancesForChain(
          matchingAllowance.caipChainId,
        );

        const rawTokenBalance =
          suggestedPriorityToken?.address &&
          chainBalances[suggestedPriorityToken.address as Hex]
            ? chainBalances[suggestedPriorityToken.address as Hex]
            : '0';
        const decimalTokenBalance = BigNumber(
          renderFromTokenMinimalUnit(
            rawTokenBalance,
            suggestedPriorityToken?.decimals || 6,
          ),
        );

        if (decimalTokenBalance.gt(0)) {
          finalToken = matchingAllowance;
        } else {
          const positiveBalanceAllowance =
            findFirstAllowanceWithPositiveBalance(
              validAllowances,
              chainBalances,
            );
          finalToken = positiveBalanceAllowance ?? matchingAllowance;
        }
      } else {
        finalToken = cardTokenAllowances[0] || null;
      }

      return {
        priorityToken: finalToken,
        allTokensWithAllowances: cardTokenAllowances,
      };
    },
    enabled: !isAuthenticated && !!sdk && !!selectedAddress,
    staleTime: UNAUTHENTICATED_CACHE_DURATION,
  });

  // --- Authenticated mode: derive from external wallet details ---
  const authenticatedPriorityToken = useMemo(() => {
    if (!isAuthenticated || !externalWalletDetailsData) {
      return null;
    }
    return externalWalletDetailsData.priorityWalletDetail ?? null;
  }, [isAuthenticated, externalWalletDetailsData]);

  const authenticatedWarning = useMemo(() => {
    if (!isAuthenticated || !externalWalletDetailsData) {
      return null;
    }
    return !externalWalletDetailsData.priorityWalletDetail
      ? CardStateWarning.NeedDelegation
      : null;
  }, [isAuthenticated, externalWalletDetailsData]);

  // --- Unified outputs ---
  const priorityToken = isAuthenticated
    ? authenticatedPriorityToken
    : (onChainData?.priorityToken ?? null);

  const allTokensWithAllowances = isAuthenticated
    ? null
    : (onChainData?.allTokensWithAllowances ?? null);

  const warning = isAuthenticated ? authenticatedWarning : null;

  const isLoading = isAuthenticated ? false : isLoadingOnChain;

  const error = isAuthenticated ? false : !!onChainError;

  const fetchPriorityToken = useCallback(async () => {
    if (!isAuthenticated) {
      const result = await refetchOnChain();
      return result.data?.priorityToken ?? null;
    }
    return authenticatedPriorityToken;
  }, [isAuthenticated, refetchOnChain, authenticatedPriorityToken]);

  // Side effect: add priorityToken to the TokenListController if it exists
  useEffect(() => {
    let isCancelled = false;

    const addToken = async () => {
      try {
        if (priorityToken && !isCancelled) {
          if (
            priorityToken.caipChainId &&
            isSolanaChainId(priorityToken.caipChainId)
          ) {
            return;
          }

          const hexChainId = safeFormatChainIdToHex(
            priorityToken.caipChainId,
          ) as `0x${string}`;

          const { allTokens } = TokensController.state;
          const allTokensPerChain = allTokens[hexChainId as Hex] || {};
          const allTokensPerAddress =
            allTokensPerChain[selectedAddress?.toLowerCase() as Hex] || [];
          const isNotOnAllTokens = !allTokensPerAddress?.find(
            (token) =>
              token.address?.toLowerCase() ===
              priorityToken.address?.toLowerCase(),
          );

          if (isNotOnAllTokens && !isCancelled) {
            const iconUrl = buildTokenIconUrl(
              priorityToken.caipChainId,
              priorityToken.address ?? '',
            );
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(hexChainId as Hex);
            setIsLoadingAddToken(true);
            await TokensController.addToken({
              address: priorityToken.address ?? '',
              symbol: priorityToken.symbol as string,
              decimals: priorityToken.decimals as number,
              name: priorityToken.name as string,
              image: iconUrl,
              networkClientId,
            });
            if (!isCancelled) {
              setIsLoadingAddToken(false);
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          const normalizedError =
            err instanceof Error ? err : new Error(String(err));
          Logger.error(
            normalizedError,
            'useGetPriorityCardToken::error adding priority token',
          );
          setIsLoadingAddToken(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAddToken(false);
        }
      }
    };

    addToken();

    return () => {
      isCancelled = true;
    };
  }, [priorityToken, TokensController, NetworkController, selectedAddress]);

  const isLoadingFinal = useMemo(
    () => isLoadingAddToken || isLoading,
    [isLoadingAddToken, isLoading],
  );

  return {
    fetchPriorityToken,
    priorityToken,
    allTokensWithAllowances,
    isLoading: isLoadingFinal,
    error,
    warning,
  };
};
