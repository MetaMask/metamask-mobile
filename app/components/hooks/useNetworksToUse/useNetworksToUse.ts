import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
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

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const {
    networks: bitcoinNetworks,
    areAllNetworksSelected: areAllBitcoinNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Bip122,
  });
  ///: END:ONLY_INCLUDE_IF

  const networksToUse = useMemo(() => {
    if (!isMultichainAccountsState2Enabled) {
      return networks;
    }

    return [
      ...evmNetworks,
      ...solanaNetworks,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      ...bitcoinNetworks,
      ///: END:ONLY_INCLUDE_IF
    ];
  }, [
    isMultichainAccountsState2Enabled,
    evmNetworks,
    solanaNetworks,
    networks,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    if (!isMultichainAccountsState2Enabled) {
      return areAllNetworksSelected || false;
    }

    return (
      areAllEvmNetworksSelected &&
      areAllSolanaNetworksSelected &&
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      areAllBitcoinNetworksSelected
      ///: END:ONLY_INCLUDE_IF
    );
  }, [
    isMultichainAccountsState2Enabled,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllNetworksSelected,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    areAllBitcoinNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return {
    networksToUse,
    evmNetworks,
    solanaNetworks,
    isMultichainAccountsState2Enabled,
    areAllNetworksSelectedCombined,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
  };
};
