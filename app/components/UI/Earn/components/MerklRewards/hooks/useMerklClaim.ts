import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import {
  CHAIN_IDS,
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
export const useMerklClaim = (asset: TokenI | undefined) => {
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
  const claimChainId = CHAIN_IDS.LINEA_MAINNET as Hex;

  const endpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, claimChainId),
  );
  const networkClientId = endpoint?.networkClientId;

  const claimRewards = useCallback(async () => {
    if (!asset) {
      setError('No asset available for claiming');
      return undefined;
    }

    if (!selectedAddress || !networkClientId) {
      setError('No account or network selected');
      return undefined;
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
        setError('No claimable rewards found');
        setIsClaiming(false);
        return undefined;
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
        type: TransactionType.musdClaim,
      });

      // Transaction request is now visible — stop showing the loader
      setIsClaiming(false);

      // transactionMeta can be undefined if user cancels before tx is created
      if (!transactionMeta) {
        return undefined;
      }

      // Wait for transaction hash (indicates tx is submitted to network)
      const txHash = await result;

      return { txHash, transactionMeta };
    } catch (e) {
      const { name, code, message } = e as Error & { code?: number };

      // Ignore AbortError - component unmounted or request was cancelled
      // Still reset isClaiming so the spinner doesn't stick if the component
      // is still mounted (e.g. a stale abort from a deduplicated request).
      if (name === 'AbortError') {
        setIsClaiming(false);
        return undefined;
      }

      // Don't show error if user rejected/cancelled the transaction (EIP-1193 code 4001)
      const isUserRejection = code === 4001;

      if (!isUserRejection) {
        setError(message);
      }
      setIsClaiming(false);
      return undefined;
    }
  }, [selectedAddress, networkClientId, asset, claimChainId]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
