import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import {
  WalletDevice,
  TransactionStatus,
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
  onClaimSuccess?: () => Promise<void>;
}

export const useMerklClaim = ({
  asset,
  onClaimSuccess,
}: UseMerklClaimOptions) => {
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

      // Wait for transaction hash (submission)
      await result.result;
      const { id: transactionId } = result.transactionMeta;

      // Wait for transaction confirmation (mined in a block)
      // Contract state changes (like updating the claimed mapping) only happen after confirmation
      await new Promise<void>((resolve, reject) => {
        // Capture unsubscribe functions to clean up all subscriptions when one fires
        const unsubscribes: (() => void)[] = [];

        // Helper to clean up all subscriptions and resolve/reject
        const cleanupAndResolve = () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
          resolve();
        };

        const cleanupAndReject = (rejectionError: Error) => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
          reject(rejectionError);
        };

        // Handle successful confirmation
        // transactionConfirmed event passes transactionMeta directly
        // Note: transactionConfirmed can fire with TransactionStatus.failed,
        // so we must check the status and handle both cases
        const confirmedListener = (
          Engine.controllerMessenger.subscribeOnceIf as unknown as (
            eventType: string,
            handler: (transactionMeta: {
              id: string;
              status:
                | typeof TransactionStatus.confirmed
                | typeof TransactionStatus.failed;
              error?: { message?: string };
            }) => void,
            criteria: (transactionMeta: { id: string }) => boolean,
          ) => () => void
        )(
          'TransactionController:transactionConfirmed',
          (transactionMeta) => {
            if (transactionMeta.status === TransactionStatus.confirmed) {
              cleanupAndResolve();
            } else if (transactionMeta.status === TransactionStatus.failed) {
              cleanupAndReject(
                new Error(
                  transactionMeta.error?.message ?? 'Transaction failed',
                ),
              );
            }
          },
          (transactionMeta) => transactionMeta.id === transactionId,
        );
        unsubscribes.push(confirmedListener);

        // Handle transaction failure
        // transactionFailed event passes { transactionMeta } as an object
        const failedListener = (
          Engine.controllerMessenger.subscribeOnceIf as unknown as (
            eventType: string,
            handler: () => void,
            criteria: (payload: { transactionMeta: { id: string } }) => boolean,
          ) => () => void
        )(
          'TransactionController:transactionFailed',
          () => {
            cleanupAndReject(new Error('Transaction failed'));
          },
          ({ transactionMeta }) => transactionMeta.id === transactionId,
        );
        unsubscribes.push(failedListener);

        // Handle transaction rejection (user cancelled)
        // transactionRejected event passes { transactionMeta } as an object
        const rejectedListener = (
          Engine.controllerMessenger.subscribeOnceIf as unknown as (
            eventType: string,
            handler: () => void,
            criteria: (payload: { transactionMeta: { id: string } }) => boolean,
          ) => () => void
        )(
          'TransactionController:transactionRejected',
          () => {
            cleanupAndReject(new Error('Transaction was rejected'));
          },
          ({ transactionMeta }) => transactionMeta.id === transactionId,
        );
        unsubscribes.push(rejectedListener);
      });

      // Refetch claimed amount from blockchain after transaction confirmation
      // This will update the UI to reflect the new claimed state
      if (onClaimSuccess) {
        await onClaimSuccess();
      }

      return result;
    } catch (e) {
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      throw e;
    } finally {
      setIsClaiming(false);
    }
  }, [selectedAddress, networkClientId, asset, onClaimSuccess]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
