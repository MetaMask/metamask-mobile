import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsEIP1559Network,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { resetTransaction } from '../../../actions/transaction';
import { decGWEIToHexWEI } from '../../../util/conversions';
import { addHexPrefix, BNToHex } from '../../../util/number';
import {
  TransactionMeta,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import AppConstants from '../../../core/AppConstants';
import { TxData } from '@metamask/bridge-controller';
import {
  EthGasPriceEstimate,
  GasFeeEstimates,
  LegacyGasPriceEstimate,
} from '@metamask/gas-fee-controller';
import BigNumber from 'bignumber.js';
import { getTransaction1559GasFeeEstimates } from '../../../components/UI/Swaps/utils/gas';
import {
  addTransaction,
  updateTransaction,
} from '../../transaction-controller';
import { Hex } from '@metamask/utils';

const DEFAULT_GAS_FEE_OPTION_LEGACY = AppConstants.GAS_OPTIONS.MEDIUM;

async function getGasFeeEstimatesForTransaction(
  transaction: TxData,
  gasEstimates:
    | GasFeeEstimates
    | EthGasPriceEstimate
    | LegacyGasPriceEstimate
    | Record<string, never>,
  { chainId, isEIP1559Network }: { chainId: Hex; isEIP1559Network: boolean },
) {
  if (isEIP1559Network) {
    const transactionGasFeeEstimates = await getTransaction1559GasFeeEstimates(
      {
        ...transaction,
        chainId: transaction.chainId.toString() as Hex,
        gasLimit: transaction.gasLimit?.toString(),
      },
      chainId,
    );
    return transactionGasFeeEstimates;
  }

  return {
    gasPrice: addHexPrefix(
      String(
        decGWEIToHexWEI(
          'gasPrice' in gasEstimates
            ? gasEstimates.gasPrice
            : (gasEstimates as GasFeeEstimates | LegacyGasPriceEstimate)[
                DEFAULT_GAS_FEE_OPTION_LEGACY
              ],
        ),
      ),
    ),
  };
}

export default function useHandleTx() {
  const isEIP1559Network = useSelector(selectIsEIP1559Network);
  const networkClientId = useSelector(selectSelectedNetworkClientId);
  const chainId = useSelector(selectChainId);
  const gasEstimates = useSelector(selectGasFeeEstimates);

  const handleTx = async ({
    txType,
    txParams,
    fieldsToAddToTxMeta,
  }: {
    txType: TransactionType.bridge | TransactionType.bridgeApproval;
    txParams: TxData;
    fieldsToAddToTxMeta: Omit<Partial<TransactionMeta>, 'status'>; // We don't add status, so omit it to fix the type error
  }) => {
    resetTransaction();
    const gasFeeEstimates = await getGasFeeEstimatesForTransaction(
      txParams,
      gasEstimates,
      { chainId: chainId as Hex, isEIP1559Network },
    );

    const gasLimitHex = BNToHex(new BigNumber(txParams.gasLimit ?? 0));
    const { transactionMeta } = await addTransaction(
      {
        ...txParams,
        ...gasFeeEstimates,
        chainId: txParams.chainId.toString() as Hex,
        gasLimit: gasLimitHex,
        gas: gasLimitHex,
      },
      {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: process.env.MM_FOX_CODE,
        requireApproval: false,
        type: txType,
      },
    );

    // Note that updateTransaction doesn't actually error if you add fields that don't conform the to the txMeta type
    // they will be there at runtime, but you just don't get any type safety checks on them
    updateTransaction({ ...transactionMeta, ...fieldsToAddToTxMeta }, '');

    return transactionMeta;
  };

  return { handleTx };
}
