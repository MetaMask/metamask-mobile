import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../UI/Earn/constants/networks';
import { SolScope } from '@metamask/keyring-api';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';

interface UseNetworksToUseProps {
  networks: ProcessedNetwork[];
  networkType: NetworkType;
  areAllNetworksSelected?: boolean;
}

interface UseNetworksToUseReturn {
  networksToUse: ProcessedNetwork[];
  evmNetworks: ProcessedNetwork[];
  solanaNetworks: ProcessedNetwork[];
  isMultichainAccountsState2Enabled: boolean;
  selectedEvmAccount: InternalAccount | null;
  selectedSolanaAccount: InternalAccount | null;
  areAllNetworksSelectedCombined: boolean;
  areAllEvmNetworksSelected: boolean;
  areAllSolanaNetworksSelected: boolean;
}

/**
 * Hook to determine which networks to use based on multichain account state
 * and available EVM/Solana networks.
 *
 * @param networks - Default networks from useNetworksByNamespace
 * @param networkType - Type of networks (Popular, Custom, etc.)
 * @returns The appropriate networks to use based on multichain state
 */
export const useNetworksToUse = ({
  networks,
  networkType,
  areAllNetworksSelected,
}: UseNetworksToUseProps): UseNetworksToUseReturn => {
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const selectedEvmAccount =
    useSelector(selectSelectedInternalAccountByScope)(EVM_SCOPE) || null;

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  const {
    networks: evmNetworks,
    areAllNetworksSelected: areAllEvmNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Eip155,
  });

  const {
    networks: solanaNetworks,
    areAllNetworksSelected: areAllSolanaNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Solana,
  });

  const networksToUse = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (selectedEvmAccount && selectedSolanaAccount) {
        if (evmNetworks && solanaNetworks) {
          return [...evmNetworks, ...solanaNetworks];
        } else if (evmNetworks) {
          return evmNetworks;
        } else if (solanaNetworks) {
          return solanaNetworks;
        }
        return networks;
      } else if (selectedEvmAccount) {
        return evmNetworks || networks;
      } else if (selectedSolanaAccount) {
        return solanaNetworks || networks;
      }
      return networks;
    }
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    evmNetworks,
    solanaNetworks,
    networks,
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (selectedEvmAccount && selectedSolanaAccount) {
        return areAllEvmNetworksSelected && areAllSolanaNetworksSelected;
      } else if (selectedEvmAccount) {
        return areAllEvmNetworksSelected;
      } else if (selectedSolanaAccount) {
        return areAllSolanaNetworksSelected;
      }
      return areAllNetworksSelected || false;
    }
    return areAllNetworksSelected || false;
  }, [
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllNetworksSelected,
  ]);

  return {
    networksToUse,
    evmNetworks,
    solanaNetworks,
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    areAllNetworksSelectedCombined,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
  };
};
