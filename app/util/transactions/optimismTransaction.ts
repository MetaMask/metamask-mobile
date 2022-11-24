import { omit } from 'lodash';
import { BN } from 'ethereumjs-util';
import Common, { Chain, Hardfork } from '@ethereumjs/common';
import { TransactionFactory, TxData } from '@ethereumjs/tx';

import { stripHexPrefix } from '../../util/address';

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

const buildTransactionCommon = (txMeta: TxMeta) =>
  // This produces a transaction whose information does not completely match an
  // Optimism transaction — for instance, DEFAULT_CHAIN is still 'mainnet' and
  // genesis points to the mainnet genesis, not the Optimism genesis — but
  // considering that all we want to do is serialize a transaction, this works
  // fine for our use case.
  Common.forCustomChain(Chain.Mainnet, {
    chainId: new BN(stripHexPrefix(txMeta.chainId), 16),
    networkId: new BN(txMeta.metamaskNetworkId, 10),
    // Optimism only supports type-0 transactions; it does not support any of
    // the newer EIPs since EIP-155. Source:
    // <https://github.com/ethereum-optimism/optimism/blob/develop/specs/l2geth/transaction-types.md>
    defaultHardfork: Hardfork.SpuriousDragon,
  });

/**
 * Returns a transaction that can be serialized and fed to an Optimism smart contract.
 *
 * @param {Object} txMeta
 * @returns {Object}
 */
// eslint-disable-next-line import/prefer-default-export
export const buildUnserializedTransaction = (txMeta: TxMeta) => {
  const txParams = buildTxParams(txMeta);
  const common = buildTransactionCommon(txMeta);
  return TransactionFactory.fromTxData(txParams, { common });
};
