import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { EVM_SCOPE } from '../../UI/Earn/constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface UseNetworksToUseProps {
  networks: ProcessedNetwork[];
  networkType: NetworkType;
  areAllNetworksSelected?: boolean;
}

interface UseNetworksToUseReturn {
  networksToUse: ProcessedNetwork[];
  evmNetworks: ProcessedNetwork[];
  solanaNetworks: ProcessedNetwork[];
  bitcoinNetworks: ProcessedNetwork[];
  selectedEvmAccount: InternalAccount | null;
  selectedSolanaAccount: InternalAccount | null;
  selectedBitcoinAccount: InternalAccount | null;
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

  const selectedEvmAccount =
    useSelector(selectSelectedInternalAccountByScope)(EVM_SCOPE) || null;

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const selectedBitcoinAccount =
    useSelector(selectSelectedInternalAccountByScope)(BtcScope.Mainnet) || null;
  ///: END:ONLY_INCLUDE_IF

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

    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    if (selectedEvmAccount && selectedSolanaAccount && selectedBitcoinAccount) {
      if (evmNetworks && solanaNetworks && bitcoinNetworks) {
        return [...evmNetworks, ...solanaNetworks, ...bitcoinNetworks];
      } else if (evmNetworks) {
        return evmNetworks;
      } else if (solanaNetworks) {
        return solanaNetworks;
      } else if (bitcoinNetworks) {
        return bitcoinNetworks;
      }
    }
    ///: END:ONLY_INCLUDE_IF

    if (selectedEvmAccount && selectedSolanaAccount) {
      if (evmNetworks && solanaNetworks) {
        return [...evmNetworks, ...solanaNetworks];
      } else if (evmNetworks) {
        return evmNetworks;
      } else if (solanaNetworks) {
        return solanaNetworks;
      }
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      else if (bitcoinNetworks) {
        return bitcoinNetworks;
      }
      ///: END:ONLY_INCLUDE_IF
      return networks;
    } else if (selectedEvmAccount) {
      return evmNetworks || networks;
    } else if (selectedSolanaAccount) {
      return solanaNetworks || networks;
    }
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    else if (selectedBitcoinAccount) {
      return bitcoinNetworks || networks;
    }
    ///: END:ONLY_INCLUDE_IF
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    evmNetworks,
    solanaNetworks,
    networks,
    selectedEvmAccount,
    selectedSolanaAccount,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    selectedBitcoinAccount,
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    if (!isMultichainAccountsState2Enabled) {
      return areAllNetworksSelected || false;
    }

    const selectedAccountFlags = [];

    if (selectedEvmAccount) {
      selectedAccountFlags.push(areAllEvmNetworksSelected);
    }
    if (selectedSolanaAccount) {
      selectedAccountFlags.push(areAllSolanaNetworksSelected);
    }
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    if (selectedBitcoinAccount) {
      selectedAccountFlags.push(areAllBitcoinNetworksSelected);
    }
    ///: END:ONLY_INCLUDE_IF

    return selectedAccountFlags.length > 0
      ? selectedAccountFlags.every(Boolean)
      : areAllNetworksSelected || false;
  }, [
    isMultichainAccountsState2Enabled,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllNetworksSelected,
    selectedEvmAccount,
    selectedSolanaAccount,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    selectedBitcoinAccount,
    areAllBitcoinNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return {
    networksToUse,
    evmNetworks,
    solanaNetworks,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
    selectedEvmAccount,
    selectedSolanaAccount,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    selectedBitcoinAccount,
    ///: END:ONLY_INCLUDE_IF
    isMultichainAccountsState2Enabled,
    areAllNetworksSelectedCombined,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
  };
};
