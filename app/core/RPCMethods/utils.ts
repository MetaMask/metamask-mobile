import { util } from '@metamask/controllers';
import Engine from '../Engine';

export const polyfillGasPrice = async (method: string, params: any[] = []) => {
  const { TransactionController } = Engine.context;
  const data = await util.query(TransactionController.ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};

export default {
  polyfillGasPrice,
};
