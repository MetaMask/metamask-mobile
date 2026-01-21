import { useState, useCallback, useEffect, useRef } from 'react';
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
  onClaimSuccess?: () => Promise<void>;
}

export const useMerklClaim = ({
  asset,
  onClaimSuccess,
}: UseMerklClaimOptions) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingTransactionIdRef = useRef<string | null>(null);
  const onClaimSuccessRef = useRef(onClaimSuccess);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const endpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, asset.chainId as Hex),
  );
  const networkClientId = endpoint?.networkClientId;

  // Keep ref updated
  useEffect(() => {
    onClaimSuccessRef.current = onClaimSuccess;
  }, [onClaimSuccess]);

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
      pendingTransactionIdRef.current = transactionId;

      // Wait for transaction confirmation (mined in a block)
      // Contract state changes (like updating the claimed mapping) only happen after confirmation
      // We use transactionStatusUpdated to handle all status changes in one place
      await new Promise<void>((resolve, reject) => {
        let isResolved = false;
        const handleTransactionStatusUpdate = ({
          transactionMeta,
        }: {
          transactionMeta: TransactionMeta;
        }) => {
          // Only handle if this is our transaction
          if (transactionMeta.id !== transactionId || isResolved) {
            return;
          }

          if (transactionMeta.status === TransactionStatus.confirmed) {
            isResolved = true;
            Engine.controllerMessenger.unsubscribe(
              'TransactionController:transactionStatusUpdated',
              handleTransactionStatusUpdate,
            );
            pendingTransactionIdRef.current = null;
            // Update UI state immediately
            setIsClaiming(false);
            // Update token balances and account balances to reflect the new balance after claiming
            // This ensures AssetOverview shows the updated token balance immediately
            const txNetworkClientId =
              Engine.context.NetworkController.findNetworkClientIdByChainId(
                transactionMeta.chainId,
              );
            // Add a small delay to allow blockchain state to propagate after transaction confirmation
            // Then update balances with retry mechanism to ensure they're refreshed
            // Also detect tokens to ensure the token is in the tokens list
            const updateBalancesWithRetry = async (retries = 2) => {
              // Wait 1 second for blockchain state to propagate
              await new Promise((resolve) => setTimeout(resolve, 1000));

              try {
                await Promise.all([
                  // Detect tokens first to ensure they're in the tokens list
                  Engine.context.TokenDetectionController.detectTokens({
                    chainIds: [transactionMeta.chainId],
                  }),
                  // Then update balances
                  Engine.context.TokenBalancesController.updateBalances({
                    chainIds: [transactionMeta.chainId],
                  }),
                  txNetworkClientId
                    ? Engine.context.AccountTrackerController.refresh([
                        txNetworkClientId,
                      ])
                    : Promise.resolve(),
                ]);
              } catch (error) {
                // Retry if we have retries left
                if (retries > 0) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  return updateBalancesWithRetry(retries - 1);
                }
                throw error;
              }
            };

            updateBalancesWithRetry()
              .then(() => {
                // Refetch claimed amount from blockchain after balance updates complete
                if (onClaimSuccessRef.current) {
                  return onClaimSuccessRef.current();
                }
              })
              .catch(() => {
                // Ignore balance update errors, but still resolve
              })
              .finally(() => {
                resolve();
              });
          } else if (
            transactionMeta.status === TransactionStatus.failed ||
            transactionMeta.status === TransactionStatus.rejected
          ) {
            isResolved = true;
            Engine.controllerMessenger.unsubscribe(
              'TransactionController:transactionStatusUpdated',
              handleTransactionStatusUpdate,
            );
            pendingTransactionIdRef.current = null;
            // Update UI state immediately
            setIsClaiming(false);
            reject(
              new Error(
                transactionMeta.error?.message ??
                  'Transaction failed or was rejected',
              ),
            );
          }
        };

        Engine.controllerMessenger.subscribe(
          'TransactionController:transactionStatusUpdated',
          handleTransactionStatusUpdate,
        );
      });

      return result;
    } catch (e) {
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      throw e;
    } finally {
      // Always set isClaiming to false in finally block
      // The listener may have already set it, but this ensures it's cleared
      setIsClaiming(false);
      pendingTransactionIdRef.current = null;
    }
  }, [selectedAddress, networkClientId, asset]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
