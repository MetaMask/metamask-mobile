import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { EthScope } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import { addTransaction } from '../../../../util/transaction-controller';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

interface UseClaimLineaRewardTokenReturn {
  claimLineaReward: (rewardId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  claimRecipientAddress: string | null;
}

/**
 * Hook for claiming LINEA token rewards via delegation redemption.
 *
 * This hook:
 * 1. Calls the RewardsController to get signed delegation data
 * 2. Creates a transaction to redeem the delegation
 * 3. Navigates to the confirmation screen
 * 4. Tracks transaction status updates
 *
 * Note: This hook does not show any toasts - the calling component is responsible for UI feedback.
 */
const useClaimLineaRewardToken = (): UseClaimLineaRewardTokenReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  // Get EVM account from the active account group
  const selectedEvmAccount = getSelectedAccountByScope(EthScope.Mainnet);
  const selectedAccountAddress = selectedEvmAccount
    ? getFormattedAddressFromInternalAccount(selectedEvmAccount)
    : undefined;

  const claimLineaReward = useCallback(
    async (rewardId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the RewardsController to get signed delegation data
        const delegationData = await Engine.controllerMessenger.call(
          'RewardsController:claimLineaTokenReward',
          rewardId,
          selectedAccountAddress as string,
        );

        const { chainId, redeemDelegationCallData, contractAddress } =
          delegationData;

        // Find network client ID for the chain
        const { NetworkController } = Engine.context;
        const networkClientId = NetworkController.findNetworkClientIdByChainId(
          safeFormatChainIdToHex(chainId.toString()) as `0x${string}`,
        );

        if (!networkClientId) {
          throw new Error(`Network with chain ID ${chainId} not found`);
        }

        // Build transaction params
        const txParams: TransactionParams = {
          to: contractAddress as Hex,
          from: selectedAccountAddress as Hex,
          data: redeemDelegationCallData as Hex,
          chainId: safeFormatChainIdToHex(chainId.toString()) as `0x${string}`,
          value: '0x0', // todo: do we need to set a value?
        };

        // Add transaction
        const { result } = await addTransaction(txParams, {
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          networkClientId,
          origin: ORIGIN_METAMASK,
          type: TransactionType.tokenMethodTransferFrom,
        });

        // Navigate to the redesigned confirmation screen
        navigation.navigate('StakeScreens', {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        });

        // The result promise will resolve when user confirms/rejects
        try {
          await result;
        } catch {
          // User rejected - already handled by subscription
        }
      } catch (e) {
        const errorMessage = (e as Error).message;
        setIsLoading(false);
        setError(errorMessage);
      }
    },
    [selectedAccountAddress, navigation],
  );

  return {
    claimLineaReward,
    isLoading,
    error,
    claimRecipientAddress: selectedAccountAddress ?? null,
  };
};

export default useClaimLineaRewardToken;
