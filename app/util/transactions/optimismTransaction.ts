import { omit } from 'lodash';
import { TransactionFactory, TxData } from '@ethereumjs/tx';

interface TxDataWithGas extends TxData {
  gas: string;
}

interface TxMeta {
  chainId: string;
  metamaskNetworkId: string;
  txParams: TxDataWithGas;
}

const buildTxParams = (txMeta: TxMeta) => ({
  ...omit(txMeta.txParams, 'gas'),
  gasLimit: txMeta.txParams.gas,
});

/**
 * Returns a transaction that can be serialized and fed to an Optimism smart contract.
 *
 * @param txMeta - The transaction metadata.
 */
const buildUnserializedTransaction = (txMeta: TxMeta) => {
  const txParams = buildTxParams(txMeta);
  return TransactionFactory.fromTxData(txParams);
};

export default buildUnserializedTransaction;
