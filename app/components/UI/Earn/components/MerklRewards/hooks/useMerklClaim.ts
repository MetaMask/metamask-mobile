import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import {
  WalletDevice,
  TransactionStatus,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectDefaultEndpointByChainId } from '../../../../../../selectors/networkController';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { TokenI } from '../../../../Tokens/types';
import { RootState } from '../../../../../../reducers';
import { fetchMerklRewardsForAsset } from '../merkl-client';
import { DISTRIBUTOR_CLAIM_ABI, MERKL_DISTRIBUTOR_ADDRESS } from '../constants';

interface UseMerklClaimOptions {
  asset: TokenI;
}

export const useMerklClaim = ({ asset }: UseMerklClaimOptions) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const endpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, asset.chainId as Hex),
  );
  const networkClientId = endpoint?.networkClientId;

  const claimRewards = useCallback(async () => {
    if (!selectedAddress || !networkClientId) {
      setError('No account or network selected');
      return;
    }

    setIsClaiming(true);
    setError(null);

    // Cleanup function for subscription - using object wrapper to avoid TypeScript narrowing issues
    // TypeScript doesn't understand Promise executor runs synchronously, so we use an object
    const subscriptionCleanup = { fn: null as (() => void) | null };

    try {
      // Fetch claim data from Merkl API
      const rewardData = await fetchMerklRewardsForAsset(
        asset,
        selectedAddress,
      );

      if (!rewardData) {
        throw new Error('No claimable rewards found');
      }

      // Prepare claim parameters
      const users = [selectedAddress];
      const tokens = [rewardData.token.address]; // Use token.address not token object
      const amounts = [rewardData.amount];
      const proofs = [rewardData.proofs]; // Note: proofs is plural!

      // Encode the claim transaction data using ethers Interface
      const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);

      const claimData = [users, tokens, amounts, proofs];

      const encodedData = contractInterface.encodeFunctionData(
        'claim',
        claimData,
      );

      // Create transaction params
      // Use chainId from reward data (from API) or fall back to asset chainId
      const transactionChainId =
        rewardData.token.chainId ?? Number(asset.chainId);

      const txParams = {
        from: selectedAddress as Hex,
        to: MERKL_DISTRIBUTOR_ADDRESS as Hex,
        value: '0x0',
        data: encodedData as Hex,
        chainId: toHex(transactionChainId),
      };

      // Submit transaction
      const result = await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: 'merkl-claim',
      });

      const { id: transactionId } = result.transactionMeta;

      // Wait for transaction confirmation (mined in a block)
      // Contract state changes (like updating the claimed mapping) only happen after confirmation
      // We use transactionStatusUpdated to handle all status changes in one place
      // IMPORTANT: Subscribe BEFORE awaiting result.result to avoid race condition
      // on fast L2 chains where tx can confirm before subscription is set up

      // Define handler type for use in unsubscribe before handler is assigned
      type StatusHandler = ({
        transactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => void;

      // Declare outside Promise so we can clean up in catch/finally if needed
      let handleTransactionStatusUpdate: StatusHandler;

      const confirmationPromise = new Promise<void>((resolve, reject) => {
        let isResolved = false;

        const unsubscribe = () => {
          Engine.controllerMessenger.unsubscribe(
            'TransactionController:transactionStatusUpdated',
            handleTransactionStatusUpdate,
          );
        };

        // Expose cleanup for catch/finally blocks
        subscriptionCleanup.fn = unsubscribe;

        handleTransactionStatusUpdate = ({ transactionMeta }) => {
          // Only handle if this is our transaction
          if (transactionMeta.id !== transactionId || isResolved) {
            return;
          }

          if (transactionMeta.status === TransactionStatus.confirmed) {
            isResolved = true;
            unsubscribe();
            // Resolve immediately - navigation.replace() in ClaimMerklRewards
            // will remount the screen and fetch fresh data from the contract
            resolve();
          } else if (
            transactionMeta.status === TransactionStatus.failed ||
            transactionMeta.status === TransactionStatus.rejected
          ) {
            isResolved = true;
            unsubscribe();
            // Note: isClaiming reset is handled by finally block after reject propagates
            reject(
              new Error(
                transactionMeta.error?.message ??
                  'Transaction failed or was rejected',
              ),
            );
          }
        };

        // Subscribe BEFORE checking current state to avoid missing events
        Engine.controllerMessenger.subscribe(
          'TransactionController:transactionStatusUpdated',
          handleTransactionStatusUpdate,
        );

        // Check if transaction is already in a terminal state (handles fast L2 chains)
        // This must happen AFTER subscribing to avoid race condition
        const currentTxMeta =
          Engine.context.TransactionController.state.transactions.find(
            (tx) => tx.id === transactionId,
          );
        if (currentTxMeta && !isResolved) {
          // Manually invoke the handler with the current state
          handleTransactionStatusUpdate({ transactionMeta: currentTxMeta });
        }
      });

      // Wait for transaction hash (submission)
      await result.result;

      // Wait for confirmation (subscription already set up above)
      await confirmationPromise;

      return result;
    } catch (e) {
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      // Reset claiming state immediately on error (defensive - finally block also does this)
      setIsClaiming(false);
      throw e;
    } finally {
      // Clean up subscription if it exists and wasn't already cleaned up
      // This handles the case where result.result throws before a status update
      subscriptionCleanup.fn?.();
      // Always set isClaiming to false in finally block
      setIsClaiming(false);
    }
  }, [selectedAddress, networkClientId, asset]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
