import { BridgeStatusControllerMessenger } from '@metamask/bridge-status-controller';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeStatusControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): BridgeStatusControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'BridgeStatusController',
    allowedActions: [
      'AccountsController:getSelectedMultichainAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getState',
      'BridgeController:getBridgeERC20Allowance',
      'BridgeController:stopPollingForQuotes',
      'BridgeController:trackUnifiedSwapBridgeEvent',
      'GasFeeController:getState',
      'AccountsController:getAccountByAddress',
      'SnapController:handleRequest',
      'TransactionController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    allowedEvents: [
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'MultichainTransactionsController:transactionConfirmed',
    ],
  });
}
