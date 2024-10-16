import { Web3Provider } from '@ethersproject/providers';
import { captureException } from '@sentry/react-native';
import { Contract, BigNumber } from 'ethers';
import poolStakingContractJson from './abi1.json';
import { ChainId, StakeSdk, StakingType } from '@metamask/stake-sdk';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { selectChainId } from '../../../../../selectors/networkController';
import { useMemo } from 'react';
import { hexToDecimal } from '../../../../../util/conversions';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { addTransaction } from '../../../../../util/transaction-controller';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const PoolStakingContract = {
  // Mainnet
  1: {
    address: '0x4fef9d741011476750a243ac70b9789a63dd47df',
    abi: poolStakingContractJson.abi,
  },
  // Holesky
  17000: {
    address: '0x37bf0883c27365cffcd0c4202918df930989891f',
    abi: poolStakingContractJson.abi,
  },
};

const initPoolStakingContract = (
  chainId: ChainId = ChainId.ETHEREUM,
): Contract => {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );

  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  return new Contract(
    PoolStakingContract[chainId].address,
    PoolStakingContract[chainId].abi,
    new Web3Provider(provider),
  );
};

export const estimateDepositGas =
  (poolStakingContract: Contract) =>
  async (
    depositValueWei: string,
    receiver: string,
    referrer: string,
  ): Promise<number> => {
    let estimatedGas;

    try {
      estimatedGas = await poolStakingContract.estimateGas.deposit(
        receiver,
        referrer,
        { value: depositValueWei.toString(), from: receiver },
      );
    } catch (e) {
      const errorMessage = (e as Error).message;
      captureException(
        new Error(
          `Gas estimation failed for Pooled Staking contract with message: ${errorMessage}`,
        ),
      );
    }
    if (BigNumber.isBigNumber(estimatedGas)) return estimatedGas.toNumber();
    throw Error(
      `Unexpected deposit gas estimation output from Pooled Staking contract with value: ${estimatedGas}`,
    );
  };

const generateDepositTxParams = (
  valueWei: string,
  activeAccountAddress: string,
  encodedDepositTransactionData: string,
  chainId: ChainId,
): TransactionParams => ({
  to: PoolStakingContract[chainId].address,
  from: activeAccountAddress,
  chainId: `0x${chainId}`,
  data: encodedDepositTransactionData,
  value: toHex(valueWei.toString()),
  // TODO: Add STAKING.STAKE/UNSTAKE/CLAIM TransactionTypes
  // type: TransactionTypes.STAKING.STAKE
});

const attemptDepositTransaction =
  (poolStakingContract: Contract, stakeSdk: StakeSdk) =>
  async (
    depositValueWei: string,
    receiver: string, // the address that can claim exited ETH
    gasBufferPercentage: number = 30, // 30% Buffer
    referrer: string = ZERO_ADDRESS, // any address to track referrals or deposits from different interfaces (can use zero address if not needed)
  ) => {
    try {
      const gasLimit = await estimateDepositGas(poolStakingContract)(
        depositValueWei,
        receiver,
        referrer,
      );

      const encodedDepositTransactionData =
        await stakeSdk.pooledStakingContractService.encodeDepositTransactionData(
          depositValueWei,
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
        data,
        chainId,
      );

      // TODO: Add Stake/Unstake/Claim TransactionType to display contract method in confirmation screen.
      return addTransaction(txParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        type: TransactionType.contractInteraction,
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

const useDepositPoolStake = () => {
  const chainId = useSelector(selectChainId);

  const stakeSdk = useMemo(
    () =>
      StakeSdk.create({
        chainId: parseInt(hexToDecimal(chainId).toString()),
        stakingType: StakingType.POOLED,
      }),
    [chainId],
  );

  const poolStakingContract = useMemo(
    () => initPoolStakingContract(hexToDecimal(chainId) as ChainId),
    [chainId],
  );

  return {
    poolStakingContract,
    estimateDepositGas: estimateDepositGas(poolStakingContract),
    attemptDepositTransaction: attemptDepositTransaction(
      poolStakingContract,
      stakeSdk,
    ),
  };
};

export default useDepositPoolStake;
