import { query } from '@metamask/controller-utils';
import { ethErrors } from 'eth-json-rpc-errors';
import Engine from '../Engine';

export const polyfillGasPrice = async (method: string, params: any[] = []) => {
  const { TransactionController } = Engine.context;
  const data = await query(TransactionController.ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};

export const validateParams = (
  obj: any,
  properties: string[],
  name: string,
): void => {
  if (!obj) {
    throw ethErrors.rpc.invalidParams(`"${name}" is not defined`);
  }
  properties.forEach((property) => {
    if (!obj[property]) {
      throw ethErrors.rpc.invalidParams(
        `${property} property of ${name} is not defined`,
      );
    }
  });
};

export default {
  polyfillGasPrice,
};
