import { query } from '@metamask/controller-utils';
import Engine from '../Engine';
import EthQuery from '@metamask/eth-query';

export const UNSUPPORTED_RPC_METHODS = new Set([
  // This is implemented later in our middleware stack – specifically, in
  // eth-json-rpc-middleware – but our UI does not support it.
  'eth_signTransaction' as const,
]);

export const polyfillGasPrice = async (
  method: string,
  origin: string,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = [],
) => {
  const networkClientId = Engine.controllerMessenger.call(
    'SelectedNetworkController:getNetworkClientIdForDomain',
    origin,
  );

  const networkClient = Engine.controllerMessenger.call(
    'NetworkController:getNetworkClientById',
    networkClientId,
  );

  const ethQuery = new EthQuery(networkClient.provider);

  const data = await query(ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};
export default {
  polyfillGasPrice,
};
