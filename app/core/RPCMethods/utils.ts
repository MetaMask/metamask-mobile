import { query } from '@metamask/controller-utils';
import { ethErrors } from 'eth-json-rpc-errors';
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
