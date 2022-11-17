import { query } from '@metamask/controller-utils';
import Engine from '../Engine';

export const polyfillGasPrice = async (method: string, params: any[] = []) => {
  const { TransactionController } = Engine.context;
  const data = await query(TransactionController.ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};

export default {
  polyfillGasPrice,
};
