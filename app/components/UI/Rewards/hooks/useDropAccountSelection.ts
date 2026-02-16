import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { BlockchainEnum } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  mapReceivingBlockchainIdToEnum,
  findMatchingBlockchainAccount,
} from '../utils/blockchainUtils';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';

const BLOCKCHAIN_DISPLAY_NAMES: Record<BlockchainEnum, string> = {
  [BlockchainEnum.EVM]: 'Ethereum',
  [BlockchainEnum.SOLANA]: 'Solana',
  [BlockchainEnum.BITCOIN]: 'Bitcoin',
  [BlockchainEnum.TRON]: 'Tron',
};

interface UseDropAccountSelectionResult {
  /** The address to use for the drop commitment */
  selectedBlockchainAddress: string | undefined;
  /** The required blockchain enum, or null if unknown */
  requiredBlockchain: BlockchainEnum | null;
  /** Whether the current account group has a valid account for this drop */
  hasValidAccount: boolean;
  /** Human-readable error message if no matching account is found */
  accountError: string | null;
}

/**
 * Hook that determines which blockchain address to use for a drop commitment
 * based on the drop's receivingBlockchain.
 *
 * @param receivingBlockchain - The blockchain ID from the drop (e.g. 1 = EVM, 2 = Solana)
 * @returns Account selection state including the matching address and validation
 */
export const useDropAccountSelection = (
  receivingBlockchain?: number,
): UseDropAccountSelectionResult => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);

  const accounts = useMemo(() => {
    if (!selectedAccountGroup?.id) return [];
    return getAccountsByGroupId(selectedAccountGroup.id);
  }, [selectedAccountGroup?.id, getAccountsByGroupId]);

  Logger.log(
    'useDropAccountSelection: receivingBlockchain',
    receivingBlockchain,
  );

  const requiredBlockchain = useMemo(
    () =>
      receivingBlockchain !== undefined
        ? mapReceivingBlockchainIdToEnum(receivingBlockchain)
        : null,
    [receivingBlockchain],
  );

  const result = useMemo((): UseDropAccountSelectionResult => {
    Logger.log(
      'useDropAccountSelection: requiredBlockchain',
      requiredBlockchain,
    );
    if (!requiredBlockchain) {
      return {
        selectedBlockchainAddress: undefined,
        requiredBlockchain: null,
        hasValidAccount: false,
        accountError: null,
      };
    }

    const matchingAccount = findMatchingBlockchainAccount(
      accounts,
      requiredBlockchain,
    );

    Logger.log('useDropAccountSelection: matchingAccount', matchingAccount);

    if (!matchingAccount) {
      return {
        selectedBlockchainAddress: undefined,
        requiredBlockchain,
        hasValidAccount: false,
        accountError: strings('rewards.drops.no_matching_account', {
          blockchain: BLOCKCHAIN_DISPLAY_NAMES[requiredBlockchain],
        }),
      };
    }

    // Validate account supports opt-in
    const isSupported = Engine.controllerMessenger.call(
      'RewardsController:isOptInSupported',
      matchingAccount,
    );

    Logger.log('useDropAccountSelection: isSupported', isSupported);

    if (!isSupported) {
      return {
        selectedBlockchainAddress: undefined,
        requiredBlockchain,
        hasValidAccount: false,
        accountError: strings('rewards.drops.no_matching_account', {
          blockchain: BLOCKCHAIN_DISPLAY_NAMES[requiredBlockchain],
        }),
      };
    }

    return {
      selectedBlockchainAddress: matchingAccount.address,
      requiredBlockchain,
      hasValidAccount: true,
      accountError: null,
    };
  }, [accounts, requiredBlockchain]);

  return result;
};

export default useDropAccountSelection;
