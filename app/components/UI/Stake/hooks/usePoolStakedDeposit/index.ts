import { useCallback } from 'react';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import { formatEther } from 'ethers/lib/utils';
import { NetworkClientId } from '@metamask/network-controller';
import { addTransaction } from '../../../../../util/transaction-controller';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { Stake } from '../../sdk/stakeSdkProvider';
import { EVENT_PROVIDERS } from '../../constants/events';
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
  (
    pooledStakingContract: PooledStakingContract,
    networkClientId: NetworkClientId,
    trackEvent: ReturnType<typeof useMetrics>['trackEvent'],
    createEventBuilder: ReturnType<typeof useMetrics>['createEventBuilder'],
  ) =>
  async (
    depositValueWei: string,
    receiver: string, // the address that can claim exited ETH
    referrer: string = ZERO_ADDRESS, // any address to track referrals or deposits from different interfaces (can use zero address if not needed)
    isRedesigned: boolean = false,
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

      if (isRedesigned) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.STAKE_TRANSACTION_INITIATED)
            .addProperties({
              is_redesigned: true,
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              transaction_amount_eth: formatEther(depositValueWei),
            })
            .build(),
        );
      }
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
  const { trackEvent, createEventBuilder } = useMetrics();

  // Linter is complaining that function may use other dependencies
  // We will simply ignore since we don't want to use inline function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedAttemptDepositTransaction = useCallback(
    attemptDepositTransaction(
      stakingContract,
      networkClientId,
      trackEvent,
      createEventBuilder,
    ),
    [stakingContract, networkClientId, trackEvent, createEventBuilder],
  );

  return {
    attemptDepositTransaction: memoizedAttemptDepositTransaction,
  };
};

export default usePoolStakedDeposit;
