import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import {
  BtcScope,
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
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
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  bitcoinNetworks: ProcessedNetwork[];
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  tronNetworks: ProcessedNetwork[];
  ///: END:ONLY_INCLUDE_IF
  selectedEvmAccount: InternalAccount | null;
  selectedSolanaAccount: InternalAccount | null;
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  selectedBitcoinAccount: InternalAccount | null;
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  selectedTronAccount: InternalAccount | null;
  ///: END:ONLY_INCLUDE_IF
  isMultichainAccountsState2Enabled: boolean;
  areAllNetworksSelectedCombined: boolean;
  areAllEvmNetworksSelected: boolean;
  areAllSolanaNetworksSelected: boolean;
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  areAllBitcoinNetworksSelected: boolean;
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  areAllTronNetworksSelected: boolean;
  ///: END:ONLY_INCLUDE_IF
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

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const selectedTronAccount =
    useSelector(selectSelectedInternalAccountByScope)(TrxScope.Mainnet) || null;
  ///: END:ONLY_INCLUDE_IF

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

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const {
    networks: bitcoinNetworks = [],
    areAllNetworksSelected: areAllBitcoinNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Bip122,
  });
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const {
    networks: tronNetworks = [],
    areAllNetworksSelected: areAllTronNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Tron,
  });
  ///: END:ONLY_INCLUDE_IF

  // Helper functions to make network selection logic more readable
  const hasSelectedAccounts = useMemo(
    () => ({
      evm: !!selectedEvmAccount,
      solana: !!selectedSolanaAccount,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      bitcoin: !!selectedBitcoinAccount,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      tron: !!selectedTronAccount,
      ///: END:ONLY_INCLUDE_IF
    }),
    [
      selectedEvmAccount,
      selectedSolanaAccount,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      selectedBitcoinAccount,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      selectedTronAccount,
      ///: END:ONLY_INCLUDE_IF
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
    // When multichain is disabled, return original networks
    if (!isMultichainAccountsState2Enabled) {
      return networks;
    }

    if (
      hasSelectedAccounts.evm ||
      hasSelectedAccounts.solana ||
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      hasSelectedAccounts.bitcoin ||
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      hasSelectedAccounts.tron
      ///: END:ONLY_INCLUDE_IF
    ) {
      return combineAvailableNetworks([
        hasSelectedAccounts.evm ? evmNetworks : [],
        hasSelectedAccounts.solana ? solanaNetworks : [],
        ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
        hasSelectedAccounts.bitcoin ? bitcoinNetworks : [],
        ///: END:ONLY_INCLUDE_IF
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        hasSelectedAccounts.tron ? tronNetworks : [],
        ///: END:ONLY_INCLUDE_IF
      ]);
    }

    // Case: No accounts selected - fallback to default networks
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    hasSelectedAccounts.evm,
    hasSelectedAccounts.solana,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    hasSelectedAccounts.bitcoin,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    hasSelectedAccounts.tron,
    ///: END:ONLY_INCLUDE_IF
    networks,
    combineAvailableNetworks,
    evmNetworks,
    solanaNetworks,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    tronNetworks,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    // When multichain is disabled, return original areAllNetworksSelected
    if (!isMultichainAccountsState2Enabled) {
      return areAllNetworksSelected || false;
    }

    // Collect selection flags for each selected account type
    const accountSelectionFlags = [];

    if (hasSelectedAccounts.evm) {
      accountSelectionFlags.push(areAllEvmNetworksSelected);
    }

    if (hasSelectedAccounts.solana) {
      accountSelectionFlags.push(areAllSolanaNetworksSelected);
    }

    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    if (hasSelectedAccounts.bitcoin) {
      accountSelectionFlags.push(areAllBitcoinNetworksSelected);
    }
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    if (hasSelectedAccounts.tron) {
      accountSelectionFlags.push(areAllTronNetworksSelected);
    }
    ///: END:ONLY_INCLUDE_IF

    // If any accounts are selected, all their networks must be selected
    // If no accounts are selected, fallback to original areAllNetworksSelected
    return accountSelectionFlags.length > 0
      ? accountSelectionFlags.every(Boolean)
      : areAllNetworksSelected || false;
  }, [
    isMultichainAccountsState2Enabled,
    areAllNetworksSelected,
    hasSelectedAccounts,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    areAllBitcoinNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    areAllTronNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return {
    networksToUse,
    evmNetworks,
    solanaNetworks,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    tronNetworks,
    ///: END:ONLY_INCLUDE_IF
    selectedEvmAccount,
    selectedSolanaAccount,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    selectedBitcoinAccount,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    selectedTronAccount,
    ///: END:ONLY_INCLUDE_IF
    isMultichainAccountsState2Enabled,
    areAllNetworksSelectedCombined,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    areAllBitcoinNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    areAllTronNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
  };
};
