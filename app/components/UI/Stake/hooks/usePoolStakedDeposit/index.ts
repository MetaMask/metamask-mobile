import {
  CHAIN_IDS,
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { addTransaction } from '../../../../../util/transaction-controller';
import { useStakeContext } from '../useStakeContext';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { Stake } from '../../sdk/stakeSdkProvider';
import USDTContractABI from './USDT COntractABI.json';
import { ethers } from 'ethers';
import Engine from '../../../../../core/Engine';
import { Web3Provider } from '@ethersproject/providers';
import {
  APPROVE_FUNCTION_SIGNATURE,
  decodeApproveData,
} from '../../../../../util/transactions';

const receiver = '0x316BDE155acd07609872a56Bc32CcfB0B13201fA';

const MM_LENDING_CONTRACT = '0x8e59Abbd93A5822eac35dbB4DFCF1F6646e87b0F';

const USDT_CONTRACT_SEPOLIA = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';

export const getIsStablecoinApproveOrLendTransaction = (
  data: string,
  origin: string,
  to: string,
) => {
  if (!data) {
    return false;
  }

  // Check if it's from MetaMask and going to the lending contract
  return (
    origin === process.env.MM_FOX_CODE &&
    to &&
    data?.startsWith(APPROVE_FUNCTION_SIGNATURE) &&
    decodeApproveData(data).spenderAddress?.toLowerCase() ===
      MM_LENDING_CONTRACT?.toLowerCase()
  );
};

const amount = '4000000';

export const attemptDepositTransaction = async () => {
  try {
    const abi = USDTContractABI;

    const networkClientId =
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        CHAIN_IDS.SEPOLIA,
      );
    const provider = new Web3Provider(
      Engine.context.NetworkController.getNetworkClientById(
        networkClientId,
      )?.provider,
    );

    const contract = new ethers.Contract(MM_LENDING_CONTRACT, abi, provider);

    const approvaldata = contract.interface.encodeFunctionData('approve', [
      // Spender must be the lending contract. You're giving permission to the lending contract to spend your USDT.
      MM_LENDING_CONTRACT,
      // USDT has 6 decimal points.
      amount,
    ]);

    // approve spending of an erc20 token amount
    const approvalTxParam: TransactionParams = {
      to: USDT_CONTRACT_SEPOLIA,
      from: receiver,
      chainId: CHAIN_IDS.SEPOLIA,
      data: approvaldata,
      value: '0',
    };

    const approvalTx = await addTransaction(approvalTxParam, {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      networkClientId,
      origin: ORIGIN_METAMASK,
      requireApproval: false,
    });

    console.log('approvalTx', approvalTx);

    // add timeout to wait for approval tx to be confirmed
    await new Promise((resolve) => setTimeout(resolve, 20000));

    // deposit amount to lend
    const transactionData = contract.interface.encodeFunctionData('deposit', [
      amount,
      receiver,
    ]);
    const depositTxParams: TransactionParams = {
      to: MM_LENDING_CONTRACT, //
      from: receiver,
      chainId: CHAIN_IDS.SEPOLIA,
      data: transactionData,
      value: '0',
    };
    const depositTx = await addTransaction(depositTxParams, {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      networkClientId,
      origin: ORIGIN_METAMASK,
      type: TransactionType.stakingDeposit,
      requireApproval: false,
    });

    // redeem a lent amount
    // const redeemTransactionData = contract.interface.encodeFunctionData(
    //   'redeem',
    //   ['9000000', receiver, receiver],
    // );
    // const redeemTxParams: TransactionParams = {
    //   to: MM_LENDING_CONTRACT,
    //   from: receiver,
    //   chainId: CHAIN_IDS.SEPOLIA,
    //   data: redeemTransactionData,
    //   value: '0',
    // };

    // const redeemTx = await addTransaction(redeemTxParams, {
    //   deviceConfirmedOn: WalletDevice.MM_MOBILE,
    //   networkClientId,
    //   origin: ORIGIN_METAMASK,
    //   type: TransactionType.stakingUnstake,
    // });

    // withdraw a lent amount by asset value - Withdrawing 0.3 USDT
    // const withdrawTransactionData = contract.interface.encodeFunctionData(
    //   'withdraw',
    //   ['300000', receiver, receiver],
    // );
    // const withdrawTxParams: TransactionParams = {
    //   to: MM_LENDING_CONTRACT,
    //   from: receiver,
    //   chainId: CHAIN_IDS.SEPOLIA,
    //   data: withdrawTransactionData,
    //   value: '0',
    // };

    // const withdrawTx = await addTransaction(withdrawTxParams, {
    //   deviceConfirmedOn: WalletDevice.MM_MOBILE,
    //   networkClientId,
    //   origin: ORIGIN_METAMASK,
    //   type: TransactionType.stakingUnstake,
    // });

    return depositTx;
  } catch (e) {
    const errorMessage = (e as Error).message;
    trackErrorAsAnalytics('Pooled Staking Transaction Failed', errorMessage);
  }

  // withdraw function takes in assets and maxRedeem would withdraw everything
};

const usePoolStakedDeposit = () => {
  const { networkClientId } = useStakeContext() as Required<Stake>;

  return {
    attemptDepositTransaction,
  };
};

export default usePoolStakedDeposit;
