import { SecurityAlertResponse } from '@metamask/transaction-controller';
import type BN from 'bnjs4';

interface TxMeta {
  data?: string;
  from?: string;
  gas?: BN;
  gasPrice?: BN;
  to?: string;
  value?: BN;
  maxFeePerGas?: BN;
  maxPriorityFeePerGas?: BN;
  securityAlertResponse?: SecurityAlertResponse;
}

function getDefinedProperties<T extends object>(object: T): Partial<T> {
  return Object.entries(object).reduce(
    (obj, [key, val]) => (val !== undefined ? { ...obj, [key]: val } : obj),
    {} as Partial<T>,
  );
}

/**
 * Get the standard set of properties of a transaction from a larger set of tx data
 *
 * @param {object} txMeta - An object containing data about a transaction
 * @returns {object} - An object containing the standard properties of a transaction
 */
export function getTxData(txMeta: TxMeta = {}): Partial<TxMeta> {
  const {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
    securityAlertResponse,
  } = txMeta;
  const txData: Partial<TxMeta> = {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
    securityAlertResponse,
  };
  return getDefinedProperties(txData);
}

/**
 * Get meta data of a transaction, without the standard properties, from a set of tx data
 *
 * @param {object} txMeta - An object containing data about a transaction
 * @returns {object} - An object containing the standard properties of a transaction
 */
export function getTxMeta(txMeta: TxMeta = {}): Partial<TxMeta> {
  const {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ...rest
  } = txMeta;
  return getDefinedProperties(rest);
}
