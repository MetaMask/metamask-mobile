import { query } from '@metamask/controller-utils';
import Engine from '../Engine';

export const polyfillGasPrice = async (method: string, params: any[] = []) => {
  const ethQuery = Engine.controllerMessenger.call(
    'NetworkController:getEthQuery',
  );
  // @ts-expect-error TODO: Handle case where this is called prior to initialization
  const data = await query(ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};

export default {
  polyfillGasPrice,
};
