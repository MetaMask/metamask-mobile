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
import { getGlobalNetworkClientId } from '../../../../../util/networks/global-network';

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
      // STAKE-867: This is temporary logic for the unstake all action
      // if we are unstaking the total assets we send the total shares
      // the user has in the vault through getShares contract method
      // this is a quick fix for mobile only and will be refactored to cover
      // portfolio in the future. We avoid the case where contract level rounding
      // error causes 1 wei dust to be left when converting assets to shares
      // and attempting to unstake all assets
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

      const networkClientId = getGlobalNetworkClientId();

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
  const stakeContext = useStakeContext();
  const { stakedBalanceWei } = useBalance();

  const stakingContract = stakeContext.stakingContract as PooledStakingContract;

  return {
    attemptUnstakeTransaction: attemptUnstakeTransaction(stakingContract, stakedBalanceWei),
  };
};

export default usePoolStakedUnstake;
