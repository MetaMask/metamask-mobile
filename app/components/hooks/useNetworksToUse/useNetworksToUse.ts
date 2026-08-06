import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import { BtcScope, SolScope, TrxScope } from '@metamask/keyring-api';
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
  tronNetworks: ProcessedNetwork[];
  selectedEvmAccount: InternalAccount | null;
  selectedSolanaAccount: InternalAccount | null;
  selectedBitcoinAccount: InternalAccount | null;
  selectedTronAccount: InternalAccount | null;
  areAllNetworksSelectedCombined: boolean;
  areAllEvmNetworksSelected: boolean;
  areAllSolanaNetworksSelected: boolean;
  areAllBitcoinNetworksSelected: boolean;
  areAllTronNetworksSelected: boolean;
}

/**
 * Hook to determine which networks to use based on multichain account state
 * and available EVM/Solana/Bitcoin/Tron networks.
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
  const selectedEvmAccount =
    useSelector(selectSelectedInternalAccountByScope)(EVM_SCOPE) || null;

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  const selectedBitcoinAccount =
    useSelector(selectSelectedInternalAccountByScope)(BtcScope.Mainnet) || null;

  const selectedTronAccount =
    useSelector(selectSelectedInternalAccountByScope)(TrxScope.Mainnet) || null;

  const {
    networks: evmNetworks = [],
    areAllNetworksSelected: areAllEvmNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Eip155,
  });

  const {
    networks: solanaNetworks = [],
    areAllNetworksSelected: areAllSolanaNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Solana,
  });

  const {
    networks: bitcoinNetworks = [],
    areAllNetworksSelected: areAllBitcoinNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Bip122,
  });

  const {
    networks: tronNetworks = [],
    areAllNetworksSelected: areAllTronNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Tron,
  });

  // Helper functions to make network selection logic more readable
  const hasSelectedAccounts = useMemo(
    () => ({
      evm: !!selectedEvmAccount,
      solana: !!selectedSolanaAccount,
      bitcoin: !!selectedBitcoinAccount,
      tron: !!selectedTronAccount,
    }),
    [
      selectedEvmAccount,
      selectedSolanaAccount,
      selectedBitcoinAccount,
      selectedTronAccount,
    ],
  );

  const combineAvailableNetworks = useCallback(
    (networksList: ProcessedNetwork[][]) =>
      (networksList ?? []).filter(Boolean).flat().length > 0
        ? networksList.filter(Boolean).flat()
        : networks,
    [networks],
  );

  const networksToUse = useMemo(() => {
    const anySelectedAccount = [
      hasSelectedAccounts.evm,
      hasSelectedAccounts.solana,
      hasSelectedAccounts.bitcoin,
      hasSelectedAccounts.tron,
    ].some(Boolean);

    if (anySelectedAccount) {
      return combineAvailableNetworks([
        hasSelectedAccounts.evm ? evmNetworks : [],
        hasSelectedAccounts.solana ? solanaNetworks : [],
        hasSelectedAccounts.bitcoin ? bitcoinNetworks : [],
        hasSelectedAccounts.tron ? tronNetworks : [],
      ]);
    }

    // Case: No accounts selected - fallback to default networks
    return networks;
  }, [
    hasSelectedAccounts.evm,
    hasSelectedAccounts.solana,
    hasSelectedAccounts.bitcoin,
    hasSelectedAccounts.tron,
    networks,
    combineAvailableNetworks,
    evmNetworks,
    solanaNetworks,
    bitcoinNetworks,
    tronNetworks,
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    // Collect selection flags for each selected account type
    const accountSelectionFlags = [];

    if (hasSelectedAccounts.evm) {
      accountSelectionFlags.push(areAllEvmNetworksSelected);
    }

    if (hasSelectedAccounts.solana) {
      accountSelectionFlags.push(areAllSolanaNetworksSelected);
    }

    if (hasSelectedAccounts.bitcoin) {
      accountSelectionFlags.push(areAllBitcoinNetworksSelected);
    }

    if (hasSelectedAccounts.tron) {
      accountSelectionFlags.push(areAllTronNetworksSelected);
    }

    // If any accounts are selected, all their networks must be selected
    // If no accounts are selected, fallback to original areAllNetworksSelected
    return accountSelectionFlags.length > 0
      ? accountSelectionFlags.every(Boolean)
      : areAllNetworksSelected || false;
  }, [
    areAllNetworksSelected,
    hasSelectedAccounts,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllBitcoinNetworksSelected,
    areAllTronNetworksSelected,
  ]);

  return {
    networksToUse,
    evmNetworks,
    solanaNetworks,
    bitcoinNetworks,
    tronNetworks,
    selectedEvmAccount,
    selectedSolanaAccount,
    selectedBitcoinAccount,
    selectedTronAccount,
    areAllNetworksSelectedCombined,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllBitcoinNetworksSelected,
    areAllTronNetworksSelected,
  };
};
