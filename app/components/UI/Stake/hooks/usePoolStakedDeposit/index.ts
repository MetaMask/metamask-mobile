import { Web3Provider } from '@ethersproject/providers';
import { captureException } from '@sentry/react-native';
import { ChainId, StakeSdk } from '@metamask/stake-sdk';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { selectChainId } from '../../../../../selectors/networkController';
import { hexToDecimal } from '../../../../../util/conversions';
import {
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { addTransaction } from '../../../../../util/transaction-controller';
import usePoolStakeSdk from '../usePoolStakeSdk';
import { formatEther } from 'ethers/lib/utils';

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
  (stakeSdk: StakeSdk) =>
  async (
    depositValueWei: string,
    receiver: string, // the address that can claim exited ETH
    gasBufferPercentage: number = 30, // 30% Buffer
    referrer: string = ZERO_ADDRESS, // any address to track referrals or deposits from different interfaces (can use zero address if not needed)
  ) => {
    try {
      const gasLimit = await stakeSdk.pooledStakingContract.estimateDepositGas(
        formatEther(depositValueWei),
        receiver,
        referrer,
      );

      const encodedDepositTransactionData =
        await stakeSdk.pooledStakingContract.encodeDepositTransactionData(
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
        stakeSdk.pooledStakingContract.contract.address,
        data,
        chainId,
      );

      // TODO: Add Stake/Unstake/Claim TransactionType to display contract method in confirmation screen.
      return addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        // TODO: Figure out what this value is supposed to be before v1 release.
        origin: process.env.MM_FOX_CODE,
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
  const chainId = useSelector(selectChainId);

  const stakeSdk = usePoolStakeSdk(parseInt(hexToDecimal(chainId).toString()));

  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );

  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  stakeSdk.pooledStakingContract.connectSignerOrProvider(
    new Web3Provider(provider),
  );

  return {
    attemptDepositTransaction: attemptDepositTransaction(stakeSdk),
  };
};

export default usePoolStakedDeposit;
