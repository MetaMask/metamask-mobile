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
import { fetchMerklRewardsForAsset,getClaimChainId } from '../merkl-client';
import {
  DISTRIBUTOR_CLAIM_ABI,
  MERKL_CLAIM_ORIGIN,
  MERKL_DISTRIBUTOR_ADDRESS,
} from '../constants';

/**
 * Hook to handle claiming Merkl rewards
 * After successful submission, user is navigated to home page.
 * Toast notifications and balance refresh are handled globally by useMerklClaimStatus.
 */
export const useMerklClaim = (asset: TokenI) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Get the chain ID where claims should be executed
  // For mUSD, claims always go to Linea regardless of which chain the user is viewing
  const claimChainId = getClaimChainId(asset);

  const endpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, claimChainId),
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
      const tokens = [rewardData.token.address];
      const amounts = [rewardData.amount];
      const proofs = [rewardData.proofs];

      // Encode the claim transaction data using ethers Interface
      const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
      const claimData = [users, tokens, amounts, proofs];
      const encodedData = contractInterface.encodeFunctionData(
        'claim',
        claimData,
      );

      // Create transaction params
      // Use chainId from reward data (from API), fall back to the claim chain
      // For mUSD, the reward token is always on Linea so this will be Linea's chainId
      const transactionChainId =
        rewardData.token.chainId ?? Number(claimChainId);

      const txParams = {
        from: selectedAddress as Hex,
        to: MERKL_DISTRIBUTOR_ADDRESS as Hex,
        value: '0x0',
        data: encodedData as Hex,
        chainId: toHex(transactionChainId),
      };

      // Submit transaction - resolves after user approves in the wallet UI
      // Use MERKL_CLAIM_ORIGIN for transaction monitoring by useMerklClaimStatus
      const { result, transactionMeta } = await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: MERKL_CLAIM_ORIGIN,
        type: TransactionType.contractInteraction,
      });

      // transactionMeta can be undefined if user cancels before tx is created
      if (!transactionMeta) {
        setIsClaiming(false);
        return undefined;
      }

      // Wait for transaction hash (indicates tx is submitted to network)
      const txHash = await result;

      // Don't reset isClaiming here - component will unmount after navigation
      // and useMerklClaimStatus will handle the rest globally

      return { txHash, transactionMeta };
    } catch (e) {
      // Ignore AbortError - component unmounted or request was cancelled
      if ((e as Error).name === 'AbortError') {
        return undefined;
      }
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      setIsClaiming(false);
      throw e;
    }
  }, [selectedAddress, networkClientId, asset, claimChainId]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
