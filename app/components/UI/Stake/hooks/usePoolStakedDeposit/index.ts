import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import { addTransaction } from '../../../../../util/transaction-controller';
import { formatEther } from 'ethers/lib/utils';
import { useStakeContext } from '../useStakeContext';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { NetworkClientId } from '@metamask/network-controller';
import { Stake } from '../../sdk/stakeSdkProvider';

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
  (
    pooledStakingContract: PooledStakingContract,
    networkClientId: NetworkClientId,
  ) =>
  async (
    depositValueWei: string,
    receiver: string, // the address that can claim exited ETH
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

      return await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: ORIGIN_METAMASK,
        type: TransactionType.stakingDeposit,
      });
    } catch (e) {
      const errorMessage = (e as Error).message;
      trackErrorAsAnalytics('Pooled Staking Transaction Failed', errorMessage);
    }
  };

const usePoolStakedDeposit = () => {
  const { networkClientId, stakingContract } =
    useStakeContext() as Required<Stake>;

  return {
    attemptDepositTransaction: attemptDepositTransaction(
      stakingContract,
      networkClientId,
    ),
  };
};

export default usePoolStakedDeposit;
