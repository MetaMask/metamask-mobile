import { convertHexToDecimal } from '@metamask/controller-utils';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionParams } from '@metamask/transaction-controller';
import { Hex, isStrictHexString } from '@metamask/utils';
import Engine from '../../core/Engine';

/**
 * Convert the given value into a valid network ID. The ID is accepted
 * as either a number, a decimal string, or a 0x-prefixed hex string.
 *
 * @param value - The network ID to convert, in an unknown format.
 * @returns A valid network ID (as a decimal string)
 * @throws If the given value cannot be safely parsed.
 */
export function convertNetworkId(value: string | number) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return `${value}`;
  } else if (isStrictHexString(value)) {
    return `${convertHexToDecimal(value)}`;
  } else if (typeof value === 'string' && /^\d+$/u.test(value)) {
    return value;
  }
  throw new Error(`Cannot parse as a valid network ID: '${value}'`);
}

/**
 * Set the value of safe chain validation using preference controller
 *
 * @param {boolean} value
 */
export function toggleUseSafeChainsListValidation(value: boolean): void {
  const { PreferencesController } = Engine.context;
  PreferencesController.setUseSafeChainsListValidation(value);
}

/**
 * It returns an estimated L1 fee for a multi layer network.
 * Currently only for the Optimism network, but can be extended to other networks.
 *
 * @param {Object} _ - This is no longer used and can be removed
 * @param {Object} txMeta - Transaction Meta
 * @returns {String} Hex string gas fee, with no 0x prefix
 */
export const fetchEstimatedMultiLayerL1Fee = async (
  _: unknown,
  {
    chainId,
    networkClientId,
    txParams,
  }: {
    chainId?: Hex;
    txParams: TransactionParams;
    networkClientId?: NetworkClientId;
  },
) => {
  const layer1GasFee =
    await Engine.context.TransactionController.getLayer1GasFee({
      chainId,
      networkClientId,
      transactionParams: txParams,
    });

  const layer1GasFeeNoPrefix = layer1GasFee?.startsWith('0x')
    ? layer1GasFee.slice(2)
    : layer1GasFee;

  return layer1GasFeeNoPrefix;
};

/**
 * This function is only needed to get the `networkId` to support the deprecated
 * `networkVersion` provider property and the deprecated `networkChanged` provider event.
 * @deprecated
 * @returns - network id of the current network
 */
export const deprecatedGetNetworkId = async (): Promise<string> => {
  const ethQuery = Engine.controllerMessenger.call(
    'NetworkController:getEthQuery',
  );

  if (!ethQuery) {
    throw new Error('Provider has not been initialized');
  }

  return new Promise((resolve, reject) => {
    ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(convertNetworkId(result as string | number));
      }
    });
  });
};
