import { captureException } from '@sentry/react-native';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import {
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import { addTransaction } from '../../../../../util/transaction-controller';
import { formatEther } from 'ethers/lib/utils';
import { useStakeContext } from '../useStakeContext';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const generateDepositTxParams = (
  valueWei: string,
  activeAccountAddress: string,
  contractAddress: string,
  encodedDepositTransactionData: string,
  chainId: ChainId,
): TransactionParams => ({
  to: contractAddress,
  from: activeAccountAddress,
  chainId: `0x${chainId}`,
  data: encodedDepositTransactionData,
  value: toHex(valueWei.toString()),
});

const attemptDepositTransaction =
  (pooledStakingContract: PooledStakingContract) =>
  async (
    depositValueWei: string,
    receiver: string, // the address that can claim exited ETH
    gasBufferPercentage: number = 30, // 30% Buffer
    referrer: string = ZERO_ADDRESS, // any address to track referrals or deposits from different interfaces (can use zero address if not needed)
  ) => {
    try {
      const gasLimit = await pooledStakingContract.estimateDepositGas(
        formatEther(depositValueWei),
        receiver,
        referrer,
      );

      const encodedDepositTransactionData =
        await pooledStakingContract.encodeDepositTransactionData(
          formatEther(depositValueWei),
          receiver,
          referrer,
          {
            gasLimit,
            gasBufferPct: gasBufferPercentage,
          },
        );

      const { data, chainId } = encodedDepositTransactionData;

      const txParams = generateDepositTxParams(
        depositValueWei,
        receiver,
        pooledStakingContract.contract.address,
        data,
        chainId,
      );

      // TODO: Add Stake/Unstake/Claim TransactionType to display contract method in confirmation screen.
      return addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        origin: ORIGIN_METAMASK,
      });
    } catch (e) {
      const errorMessage = (e as Error).message;
      captureException(
        new Error(
          `Failed to submit Pooled Staking transaction to transaction controller with message: ${errorMessage}`,
        ),
      );
    }
  };

const usePoolStakedDeposit = () => {
  const stakeContext = useStakeContext();

  return {
    attemptDepositTransaction: attemptDepositTransaction(
      stakeContext.sdkService,
    ),
  };
};

export default usePoolStakedDeposit;
