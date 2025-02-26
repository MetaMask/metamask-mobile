import { useSelector } from 'react-redux';
import { addTransaction, updateTransaction } from '../../../../util/transaction-controller';
import { selectChainId, selectIsEIP1559Network, selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import { resetTransaction } from '../../../../actions/transaction';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { getTransaction1559GasFeeEstimates } from '../../Swaps/utils/gas';
import { addHexPrefix, BNToHex } from '../../../../util/number';
import { TransactionMeta, TransactionType, WalletDevice } from '@metamask/transaction-controller';
import { selectGasFeeEstimates } from '../../../../selectors/confirmTransaction';
import AppConstants from '../../../../core/AppConstants';
import { TxData } from '../types';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import BigNumber from 'bignumber.js';

type GasEstimatesWithPrice = GasFeeEstimates & {
  gasPrice?: string;
};

const DEFAULT_GAS_FEE_OPTION_LEGACY = AppConstants.GAS_OPTIONS.MEDIUM;

async function getGasFeeEstimatesForTransaction(
  transaction: TxData,
  gasEstimates: GasEstimatesWithPrice,
  { chainId, isEIP1559Network }: { chainId: `0x${string}`, isEIP1559Network: boolean },
) {
  if (isEIP1559Network) {
    const transactionGasFeeEstimates = await getTransaction1559GasFeeEstimates(
      {
        ...transaction,
        chainId: transaction.chainId.toString() as `0x${string}`,
        gasLimit: transaction.gasLimit?.toString() as string | undefined,
      },
      chainId,
    );
    return transactionGasFeeEstimates;
  }

  return {
    gasPrice: addHexPrefix(
      String(decGWEIToHexWEI(
        gasEstimates.gasPrice || gasEstimates[DEFAULT_GAS_FEE_OPTION_LEGACY],
      )),
    ),
  };
}

export default function useHandleTx() {
  const isEIP1559Network = useSelector(selectIsEIP1559Network);
  const networkClientId = useSelector(selectSelectedNetworkClientId);
  const chainId = useSelector(selectChainId);
  const gasEstimates = useSelector(selectGasFeeEstimates);

  const handleTx = async ({ txType, txParams, fieldsToAddToTxMeta }: {
  txType: TransactionType.bridge | TransactionType.bridgeApproval;
  txParams: TxData;
  fieldsToAddToTxMeta: Omit<Partial<TransactionMeta>, 'status'>; // We don't add status, so omit it to fix the type error
  }) => {
    resetTransaction();
    const gasFeeEstimates = await getGasFeeEstimatesForTransaction(
      txParams,
      gasEstimates as GasEstimatesWithPrice,
      { chainId: chainId as `0x${string}`, isEIP1559Network },
    );

    const gasLimitHex = BNToHex(new BigNumber(txParams.gasLimit ?? 0));
    const { transactionMeta, result } = await addTransaction(
      {
        ...{
          ...txParams,
          chainId: txParams.chainId.toString() as `0x${string}`,
          gasLimit: gasLimitHex,
          gas: gasLimitHex,
        },
        ...gasFeeEstimates,
      },
      {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: process.env.MM_FOX_CODE,
        requireApproval: false,
        type: txType,
      },
    );

    await result;

    // Note that updateTransaction doesn't actually error if you add fields that don't conform the to the txMeta type
    // they will be there at runtime, but you just don't get any type safety checks on them
    updateTransaction({...transactionMeta, ...fieldsToAddToTxMeta}, '');

    return transactionMeta;
  };

  return { handleTx };
}
