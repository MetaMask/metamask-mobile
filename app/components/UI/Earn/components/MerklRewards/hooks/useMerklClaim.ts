import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectDefaultEndpointByChainId } from '../../../../../../selectors/networkController';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { TokenI } from '../../../../Tokens/types';
import { RootState } from '../../../../../../reducers';
import { fetchMerklRewardsForAsset } from '../merkl-client';
import { DISTRIBUTOR_CLAIM_ABI, MERKL_DISTRIBUTOR_ADDRESS } from '../constants';
import Engine from '../../../../../../core/Engine';

interface UseMerklClaimOptions {
  asset: TokenI;
  onTransactionConfirmed?: () => void;
}

export const useMerklClaim = ({
  asset,
  onTransactionConfirmed,
}: UseMerklClaimOptions) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onTransactionConfirmedRef = useRef(onTransactionConfirmed);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep the callback ref updated
  onTransactionConfirmedRef.current = onTransactionConfirmed;

  // Cleanup: abort any pending fetch on unmount
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const endpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, asset.chainId as Hex),
  );
  const networkClientId = endpoint?.networkClientId;

  const claimRewards = useCallback(async () => {
    if (!selectedAddress || !networkClientId) {
      const errorMessage = 'No account or network selected';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    // Abort any previous in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsClaiming(true);
    setError(null);

    try {
      // Fetch claim data from Merkl API
      const rewardData = await fetchMerklRewardsForAsset(
        asset,
        selectedAddress,
        abortController.signal,
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

      // Submit transaction - resolves after user approves in the wallet UI
      // Use stakingClaim type to get proper toast notifications
      const { result, transactionMeta } = await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: 'merkl-claim',
        type: TransactionType.stakingClaim,
      });

      const { id: transactionId } = transactionMeta;

      // Set up listeners BEFORE awaiting result to avoid race condition
      // where transaction confirms before listeners are set up
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          setIsClaiming(false);
          onTransactionConfirmedRef.current?.();
        },
        (txMeta) => txMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        ({ transactionMeta: txMeta }) => {
          setIsClaiming(false);
          setError(txMeta.error?.message ?? 'Transaction failed');
        },
        ({ transactionMeta: txMeta }) => txMeta.id === transactionId,
      );

      // Also listen for dropped transactions - on some networks/RPC providers,
      // a successful transaction might be marked as "dropped" instead of "confirmed"
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionDropped',
        () => {
          // Transaction was dropped but might still be successful on-chain
          // Trigger refetch to check the actual contract state
          setIsClaiming(false);
          onTransactionConfirmedRef.current?.();
        },
        ({ transactionMeta: txMeta }) => txMeta.id === transactionId,
      );

      // Wait for transaction hash (indicates tx is submitted to network)
      const txHash = await result;

      // NOTE: We don't set isClaiming to false here!
      // The loading state should persist until the transaction reaches
      // a terminal status (confirmed/dropped/failed) via the listeners above.

      return { txHash, transactionMeta };
    } catch (e) {
      // Ignore AbortError - component unmounted or request was cancelled
      if ((e as Error).name === 'AbortError') {
        return undefined;
      }
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      // Only set isClaiming false on error (user rejected, etc)
      setIsClaiming(false);
      throw e;
    }
  }, [selectedAddress, networkClientId, asset]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
