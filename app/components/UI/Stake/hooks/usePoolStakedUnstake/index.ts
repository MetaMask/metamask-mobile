import { PooledStakingContract, ChainId } from '@metamask/stake-sdk';
import { useStakeContext } from '../useStakeContext';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { addTransaction } from '../../../../../util/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import useBalance from '../useBalance';
import { Stake } from '../../sdk/stakeSdkProvider';
import { NetworkClientId } from '@metamask/network-controller';

const generateUnstakeTxParams = (
  activeAccountAddress: string,
  contractAddress: string,
  encodedUnstakeTransactionData: string,
  chainId: ChainId,
): TransactionParams => ({
  to: contractAddress,
  from: activeAccountAddress,
  chainId: `0x${chainId}`,
  data: encodedUnstakeTransactionData,
  value: '0',
});

const attemptUnstakeTransaction =
  (
    pooledStakingContract: PooledStakingContract,
    stakedBalanceWei: string,
    networkClientId: NetworkClientId,
  ) =>
  // Note: receiver is the user address attempting to unstake.
  async (valueWei: string, receiver: string) => {
    try {
      // STAKE-871: if we are unstaking the total assets we send the total shares
      // the user has in the vault through getShares contract method avoiding the
      // case where contract level rounding error causes 1 wei dust to be left
      // when converting assets to shares and attempting to unstake all assets
      let shares;
      if (valueWei === stakedBalanceWei) {
        shares = await pooledStakingContract.getShares(receiver);
      } else {
        shares = await pooledStakingContract.convertToShares(valueWei);
      }

      const gasLimit = await pooledStakingContract.estimateEnterExitQueueGas(
        shares.toString(),
        receiver,
      );

      const { data, chainId } =
        await pooledStakingContract.encodeEnterExitQueueTransactionData(
          shares,
          receiver,
          { gasLimit },
        );

      const txParams = generateUnstakeTxParams(
        receiver,
        pooledStakingContract.contract.address,
        data,
        chainId,
      );

      return await addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: ORIGIN_METAMASK,
        type: TransactionType.stakingUnstake,
      });
    } catch (e) {
      const errorMessage = (e as Error).message;
      trackErrorAsAnalytics(
        'Pooled Staking Unstake Transaction Failed',
        errorMessage,
      );
    }
  };

const usePoolStakedUnstake = () => {
  const { networkClientId, stakingContract } =
    useStakeContext() as Required<Stake>;

  const { stakedBalanceWei } = useBalance();

  return {
    attemptUnstakeTransaction: attemptUnstakeTransaction(
      stakingContract,
      stakedBalanceWei,
      networkClientId,
    ),
  };
};

export default usePoolStakedUnstake;
