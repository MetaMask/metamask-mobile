import { ethers } from 'ethers';
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
  (pooledStakingContract: PooledStakingContract, stakedBalanceWei: string) =>
  // Note: receiver is the user address attempting to unstake.
  async (valueWei: string, receiver: string) => {
    try {
      // STAKE-867: This is a temporary check for if we intend to unstake all and if so send the
      // total user shares this is done here as a quick fix for mobile but will be refactored in
      //the future this is done to avoid the case where contract level rounding error causes 1 wei
      // of dust to be left over when converting valueWei to shares and unstaking. Here we ensure
      // that all the user's shares are unstaked when unstaking all.
      let shares;
      if (valueWei === stakedBalanceWei) {
        // create the interface for the getShares method and call getShares to get user shares
        const tempInterface = new ethers.utils.Interface([
          'function getShares(address) returns (uint256)',
        ]);
        const data = tempInterface.encodeFunctionData('getShares', [receiver]);
        const sharesResult = await pooledStakingContract?.contract.provider.call({
          to: pooledStakingContract?.contract.address,
          data,
        });
        const [sharesBN] = tempInterface.decodeFunctionResult('getShares', sharesResult);
        shares = sharesBN.toString();
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
  const stakeContext = useStakeContext();
  const { stakedBalanceWei } = useBalance();

  const stakingContract = stakeContext.stakingContract as PooledStakingContract;

  return {
    attemptUnstakeTransaction: attemptUnstakeTransaction(stakingContract, stakedBalanceWei),
  };
};

export default usePoolStakedUnstake;
