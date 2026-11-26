import { BridgeStatusControllerMessenger } from '@metamask/bridge-status-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeStatusControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BridgeStatusControllerMessenger>,
    MessengerEvents<BridgeStatusControllerMessenger>
  >,
): BridgeStatusControllerMessenger {
  const messenger: BridgeStatusControllerMessenger = new Messenger({
    namespace: 'BridgeStatusController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      'AssetsController:addCustomAsset',
      'AssetsController:getAssets',
      'AuthenticationController:getBearerToken',
      'BridgeController:fetchQuotes',
      'BridgeController:getState',
      'BridgeController:stopPollingForQuotes',
      'BridgeController:trackUnifiedSwapBridgeEvent',
      'KeyringController:signTypedMessage',
      'MoneyAccountController:getMoneyAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getState',
      'RemoteFeatureFlagController:getState',
      'SnapController:handleRequest',
      'TransactionController:addTransaction',
      'TransactionController:estimateGasFee',
      'TransactionController:getState',
      'TransactionController:isAtomicBatchSupported',
      'TransactionController:updateTransaction',
      'TransactionPayController:setTransactionConfig',
      'TransactionPayController:updatePaymentToken',
    ],
    events: [
      'TransactionController:transactionStatusUpdated',
      'TransactionController:unapprovedTransactionAdded',
      'TransactionPayController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
