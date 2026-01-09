import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { useCardSDK } from '../sdk';
import useGetDelegationSettings from './useGetDelegationSettings';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardNetwork,
} from '../types';
import {
  selectIsAuthenticatedCard,
  selectUserCardLocation,
} from '../../../../core/redux/slices/card';
import { SUPPORTED_ASSET_NETWORKS } from '../constants';

interface UseSpendingLimitDataReturn {
  availableTokens: CardTokenAllowance[];
  delegationSettings: DelegationSettingsResponse | null;
  isLoading: boolean;
  error: Error | null;
  fetchData: () => Promise<void>;
}

/**
 * Hook to fetch and prepare data needed for the SpendingLimit screen.
 * Builds the list of available tokens for delegation from delegation settings.
 */
const useSpendingLimitData = (): UseSpendingLimitDataReturn => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const userCardLocation = useSelector(selectUserCardLocation);

  const {
    data: delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData: fetchDelegationSettings,
  } = useGetDelegationSettings();

  const shouldProcessNetwork = useCallback(
    (
      network: DelegationSettingsResponse['networks'][0],
      hideSolana: boolean,
    ): boolean => {
      const networkLower = network.network?.toLowerCase();

      if (
        !networkLower ||
        !SUPPORTED_ASSET_NETWORKS.includes(networkLower as CardNetwork)
      ) {
        return false;
      }

      if (hideSolana && network.network === 'solana') {
        return false;
      }

      const isLineaNetwork =
        network.network === 'linea' || network.network === 'linea-us';
      if (isLineaNetwork) {
        return (
          (userCardLocation === 'us' && network.network === 'linea-us') ||
          (userCardLocation !== 'us' && network.network === 'linea')
        );
      }

      return true;
    },
    [userCardLocation],
  );

  const getCaipChainId = useCallback(
    (network: DelegationSettingsResponse['networks'][0]): CaipChainId => {
      if (network.network === 'solana') {
        return SolScope.Mainnet;
      }
      const chainIdStr = network.chainId;
      const numericChainId = chainIdStr.startsWith('0x')
        ? parseInt(chainIdStr, 16)
        : parseInt(chainIdStr, 10);
      return `eip155:${numericChainId}` as CaipChainId;
    },
    [],
  );

  const getTokenMetadata = useCallback(
    (
      tokenConfig: { address: string; symbol: string },
      caipChainId: CaipChainId,
    ): { name?: string; symbol?: string } | null => {
      if (!sdk) return null;

      const chainTokens = sdk.getSupportedTokensByChainId(caipChainId);
      const match = chainTokens.find(
        (token) =>
          token.address?.toLowerCase() === tokenConfig.address.toLowerCase() ||
          token.symbol?.toLowerCase() === tokenConfig.symbol.toLowerCase(),
      );

      if (!match) return null;
      return {
        name: match.name ?? undefined,
        symbol: match.symbol ?? undefined,
      };
    },
    [sdk],
  );

  const getTokenAddress = useCallback(
    (
      tokenConfig: { address: string; symbol: string },
      network: DelegationSettingsResponse['networks'][0],
      caipChainId: CaipChainId,
    ): string => {
      if (network.environment === 'production' || !sdk) {
        return tokenConfig.address;
      }

      const chainTokens = sdk.getSupportedTokensByChainId(caipChainId);
      const match = chainTokens.find(
        (token) =>
          token.symbol?.toLowerCase() === tokenConfig.symbol.toLowerCase(),
      );
      return match?.address || tokenConfig.address;
    },
    [sdk],
  );

  const availableTokens = useMemo<CardTokenAllowance[]>(() => {
    if (!sdk || !delegationSettings?.networks) {
      return [];
    }

    const tokens: CardTokenAllowance[] = [];
    const hideSolana = true;

    for (const network of delegationSettings.networks) {
      if (!shouldProcessNetwork(network, hideSolana)) {
        continue;
      }

      const caipChainId = getCaipChainId(network);
      const tokenEntries = Object.entries(network.tokens || {});

      for (const [, tokenConfig] of tokenEntries) {
        if (!tokenConfig.address) continue;

        const isDuplicate = tokens.some(
          (t) =>
            t.address?.toLowerCase() === tokenConfig.address.toLowerCase() &&
            t.caipChainId === caipChainId,
        );
        if (isDuplicate) continue;

        const tokenAddress = getTokenAddress(tokenConfig, network, caipChainId);
        const metadata = getTokenMetadata(tokenConfig, caipChainId);
        const isNonProduction = network.environment !== 'production';

        tokens.push({
          address: tokenAddress,
          symbol: metadata?.symbol || tokenConfig.symbol.toUpperCase(),
          name: metadata?.name || tokenConfig.symbol.toUpperCase(),
          decimals: tokenConfig.decimals,
          caipChainId,
          walletAddress: undefined,
          allowanceState: AllowanceState.NotEnabled,
          allowance: '0',
          delegationContract: network.delegationContract,
          priority: undefined,
          stagingTokenAddress: isNonProduction
            ? tokenConfig.address
            : undefined,
        });
      }
    }

    return tokens;
  }, [
    sdk,
    delegationSettings,
    shouldProcessNetwork,
    getCaipChainId,
    getTokenAddress,
    getTokenMetadata,
  ]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchDelegationSettings();
  }, [isAuthenticated, fetchDelegationSettings]);

  return {
    availableTokens,
    delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData,
  };
};

export default useSpendingLimitData;
