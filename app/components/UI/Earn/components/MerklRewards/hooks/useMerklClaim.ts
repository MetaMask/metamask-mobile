import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { WalletDevice } from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectSelectedNetworkClientId } from '../../../../../../selectors/networkController';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { TokenI } from '../../../../Tokens/types';

const MERKL_DISTRIBUTOR_ADDRESS =
  '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae' as const;
const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';

// ABI for the claim method
const DISTRIBUTOR_ABI = [
  'function claim(address[] calldata users, address[] calldata tokens, uint256[] calldata amounts, bytes32[][] calldata proofs)',
];

interface MerklRewardData {
  rewards: {
    token: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      price: number | null;
    };
    accumulated: string;
    unclaimed: string;
    pending: string;
    proofs: string[];
    amount: string;
    claimed: string;
    recipient: string;
  }[];
}

interface UseMerklClaimOptions {
  asset: TokenI;
}

export const useMerklClaim = ({ asset }: UseMerklClaimOptions) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const networkClientId = useSelector(selectSelectedNetworkClientId);

  const claimRewards = useCallback(async () => {
    if (!selectedAddress || !networkClientId) {
      setError('No account or network selected');
      return;
    }

    setIsClaiming(true);
    setError(null);

    try {
      // Fetch claim data from Merkl API using asset's chainId
      // Convert hex chainId to decimal for API (e.g., '0x1' -> 1)
      const decimalChainId = Number(asset.chainId);
      const response = await fetch(
        `${MERKL_API_BASE_URL}/users/${selectedAddress}/rewards?chainId=${decimalChainId}&test=true`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Merkl rewards: ${response.status}`);
      }

      const data: MerklRewardData[] = await response.json();

      // Get the first reward data
      if (!data?.[0]?.rewards?.[0]) {
        throw new Error('No claimable rewards found');
      }

      const rewardData = data[0].rewards[0];

      // Prepare claim parameters
      const users = [selectedAddress];
      const tokens = [rewardData.token.address]; // Use token.address not token object
      const amounts = [rewardData.pending];
      const proofs = [rewardData.proofs]; // Note: proofs is plural!

      // Encode the claim transaction data using ethers Interface
      const contractInterface = new Interface(DISTRIBUTOR_ABI);

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

      return result;
    } catch (e) {
      const errorMessage = (e as Error).message;
      setError(errorMessage);
      throw e;
    } finally {
      setIsClaiming(false);
    }
  }, [selectedAddress, networkClientId, asset.chainId]);

  return {
    claimRewards,
    isClaiming,
    error,
  };
};
