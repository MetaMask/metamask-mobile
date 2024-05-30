'use strict';

import notifee from '@notifee/react-native';
import Engine from './Engine';
import { hexToBN, renderFromWei } from '../util/number';
import Device from '../util/device';
import { STORAGE_IDS } from '../util/notifications/settings/storage/constants';
import { strings } from '../../locales/i18n';
import { AppState } from 'react-native';

import {
  NotificationTransactionTypes,
  isNotificationsFeatureEnabled,
  requestPushNotificationsPermission,
} from '../util/notifications';
import { safeToChecksumAddress } from '../util/address';
import ReviewManager from './ReviewManager';
import { selectChainId } from '../selectors/networkController';
import { store } from '../store';
const constructTitleAndMessage = (data) => {
  let title, message;
  switch (data.type) {
    case NotificationTransactionTypes.pending:
      title = strings('notifications.pending_title');
      message = strings('notifications.pending_message');
      break;
    case NotificationTransactionTypes.pending_deposit:
      title = strings('notifications.pending_deposit_title');
      message = strings('notifications.pending_deposit_message');
      break;
    case NotificationTransactionTypes.pending_withdrawal:
      title = strings('notifications.pending_withdrawal_title');
      message = strings('notifications.pending_withdrawal_message');
      break;
    case NotificationTransactionTypes.success:
      title = strings('notifications.success_title', {
        nonce: data?.transaction?.nonce || '',
      });
      message = strings('notifications.success_message');
      break;
    case NotificationTransactionTypes.speedup:
      title = strings('notifications.speedup_title', {
        nonce: data?.transaction?.nonce || '',
      });
      message = strings('notifications.speedup_message');
      break;
    case NotificationTransactionTypes.success_withdrawal:
      title = strings('notifications.success_withdrawal_title');
      message = strings('notifications.success_withdrawal_message');
      break;
    case NotificationTransactionTypes.success_deposit:
      title = strings('notifications.success_deposit_title');
      message = strings('notifications.success_deposit_message');
      break;
    case NotificationTransactionTypes.error:
      title = strings('notifications.error_title');
      message = strings('notifications.error_message');
      break;
    case NotificationTransactionTypes.cancelled:
      title = strings('notifications.cancelled_title');
      message = strings('notifications.cancelled_message');
      break;
    case NotificationTransactionTypes.received:
      title = strings('notifications.received_title', {
        amount: data.transaction.amount,
        assetType: data.transaction.assetType,
      });
      message = strings('notifications.received_message');
      break;
    case NotificationTransactionTypes.received_payment:
      title = strings('notifications.received_payment_title');
      message = strings('notifications.received_payment_message', {
        amount: data.transaction.amount,
      });
      break;
  }
  return { title, message };
};

/**
 * Singleton class responsible for managing all the
 * related notifications, which could be in-app or push
 * depending on the state of the app
 */
class NotificationManager {
  /**
   * Navigation object from react-navigation
   */
  _navigation;
  /**
   * Array containing the id of the transaction that should be
   * displayed while interacting with a notification
   */
  _transactionToView;
  /**
   * Boolean based on the current state of the app
   */
  _backgroundMode;

  /**
   * Object containing watched transaction ids list by transaction nonce
   */
  _transactionsWatchTable = {};

  _handleAppStateChange = (appState) => {
    this._backgroundMode = appState === 'background';
  };

  _viewTransaction = (id) => {
    this._transactionToView.push(id);
    this.goTo('TransactionsHome');
  };

  _removeListeners = (transactionId) => {
    const { TransactionController } = Engine.context;
    TransactionController.hub.removeAllListeners(`${transactionId}:confirmed`);
    TransactionController.hub.removeAllListeners(`${transactionId}:finished`);
  };

  // TODO: Refactor this method to use notifee's channels in combination with MM auth
  _showNotification(data, channelId = STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID) {
    if (this._backgroundMode) {
      const { title, message } = constructTitleAndMessage(data);
      const id = data?.transaction?.id || '';
      if (id) {
        this._transactionToView.push(id);
      }

      const pushData = {
        title,
        body: message,
        android: {
          lightUpScreen: false,
          channelId,
          smallIcon: 'ic_notification_small',
          largeIcon: 'ic_notification',
          pressAction: {
            id: 'default',
            launchActivity: 'com.metamask.ui.MainActivity',
          },
        },
        ios: {
          foregroundPresentationOptions: {
            alert: false,
            sound: false,
            badge: false,
            banner: false,
            list: false,
          },
        },
      };

      const extraData = { action: 'tx', id };
      pushData.data = { ...data?.transaction, ...extraData };
      if (Device.isAndroid()) {
        pushData.tag = JSON.stringify(extraData);
      } else {
        pushData.userInfo = extraData; // check if is still needed
      }

      isNotificationsFeatureEnabled() && notifee.displayNotification(pushData);
    } else {
      this._showTransactionNotification({
        autodismiss: data.duration,
        transaction: data.transaction,
        status: data.type,
      });
    }
  }

  _finishedCallback = (transactionMeta) => {
    // If it fails we hide the pending tx notification
    this._removeNotificationById(transactionMeta.id);
    const transaction =
      this._transactionsWatchTable[transactionMeta.txParams.nonce];
    transaction &&
      transaction.length &&
      setTimeout(() => {
        // Then we show the error notification
        this._showNotification({
          type: transactionMeta.status === 'cancelled' ? 'cancelled' : 'error',
          autoHide: true,
          transaction: { id: transactionMeta.id },
          duration: 5000,
        });
        // Clean up
        this._removeListeners(transactionMeta.id);
        delete this._transactionsWatchTable[transactionMeta.txParams.nonce];
      }, 2000);
  };

  _confirmedCallback = (transactionMeta, originalTransaction) => {
    // Once it's confirmed we hide the pending tx notification
    this._removeNotificationById(transactionMeta.id);
    this._transactionsWatchTable[transactionMeta.txParams.nonce].length &&
      setTimeout(() => {
        // Then we show the success notification
        this._showNotification({
          type: 'success',
          autoHide: true,
          transaction: {
            id: transactionMeta.id,
            nonce: `${hexToBN(transactionMeta.txParams.nonce).toString()}`,
          },
          duration: 5000,
        });
        // Clean up
        this._removeListeners(transactionMeta.id);

        const {
          TokenBalancesController,
          TokenDetectionController,
          NftDetectionController,
          AccountTrackerController,
        } = Engine.context;
        // account balances for ETH txs
        // Detect assets and tokens for ERC20 txs
        // Detect assets for ERC721 txs
        // right after a transaction was confirmed
        const pollPromises = [AccountTrackerController.refresh()];
        switch (originalTransaction.assetType) {
          case 'ERC20': {
            pollPromises.push(
              ...[
                TokenBalancesController.poll(),
                TokenDetectionController.start(),
              ],
            );
            break;
          }
          case 'ERC721':
            pollPromises.push(NftDetectionController.start());
            break;
        }
        Promise.all(pollPromises);

        Device.isIos() &&
          setTimeout(() => {
            requestPushNotificationsPermission();
          }, 5000);

        // Prompt review
        ReviewManager.promptReview();

        this._removeListeners(transactionMeta.id);
        delete this._transactionsWatchTable[transactionMeta.txParams.nonce];
      }, 2000);
  };

  _speedupCallback = (transactionMeta) => {
    this.watchSubmittedTransaction(transactionMeta, true);
    setTimeout(() => {
      this._showNotification({
        autoHide: false,
        type: 'speedup',
        transaction: {
          id: transactionMeta.id,
          nonce: `${hexToBN(transactionMeta.txParams.nonce).toString()}`,
        },
      });
    }, 2000);
  };

  /**
   * Creates a NotificationManager instance
   */
  constructor(
    _navigation,
    _showTransactionNotification,
    _hideTransactionNotification,
    _showSimpleNotification,
    _removeNotificationById,
  ) {
    if (!NotificationManager.instance) {
      this._navigation = _navigation;
      this._showTransactionNotification = _showTransactionNotification;
      this._hideTransactionNotification = _hideTransactionNotification;
      this._showSimpleNotification = _showSimpleNotification;
      this._removeNotificationById = _removeNotificationById;
      this._transactionToView = [];
      this._backgroundMode = false;
      NotificationManager.instance = this;
      AppState.addEventListener('change', this._handleAppStateChange);
    }

    return NotificationManager.instance;
  }

  /**
   * Navigates to a specific view
   */
  goTo(view) {
    this._navigation.navigate(view);
  }

  onMessageReceived(data) {
    this._showNotification(data);
  }

  /**
   * Returns the id of the transaction that should
   * be displayed and removes it from memory
   */
  getTransactionToView = () => this._transactionToView.pop();

  /**
   * Sets the id of the transaction that should
   * be displayed in memory
   */
  setTransactionToView = (id) => {
    this._transactionToView.push(id);
  };

  /**
   * Shows a notification with title and description
   */
  showSimpleNotification = (data) => {
    const id = Date.now();
    this._showSimpleNotification({
      id,
      autodismiss: data.duration,
      title: data.title,
      description: data.description,
      status: data.status,
    });
    return id;
  };

  /**
   * Listen for events of a submitted transaction
   * and generates the corresponding notification
   * based on the status of the transaction (failed or confirmed)
   */
  watchSubmittedTransaction(transaction, speedUp = false) {
    if (transaction.silent) return false;
    const { TransactionController } = Engine.context;
    const transactionMeta = TransactionController.state.transactions.find(
      ({ id }) => id === transaction.id,
    );

    const nonce = transactionMeta.txParams.nonce;
    // First we show the pending tx notification if is not an speed up tx
    !speedUp &&
      this._showNotification({
        type: 'pending',
        autoHide: false,
        transaction: {
          id: transactionMeta.id,
        },
      });

    this._transactionsWatchTable[nonce]
      ? this._transactionsWatchTable[nonce].push(transactionMeta.id)
      : (this._transactionsWatchTable[nonce] = [transactionMeta.id]);

    TransactionController.hub.once(
      `${transaction.id}:confirmed`,
      (transactionMeta) => {
        this._confirmedCallback(transactionMeta, transaction);
      },
    );
    TransactionController.hub.once(
      `${transaction.id}:finished`,
      (transactionMeta) => {
        this._finishedCallback(transactionMeta);
      },
    );
    TransactionController.hub.once(
      `${transaction.id}:speedup`,
      (transactionMeta) => {
        this._speedupCallback(transactionMeta);
      },
    );
  }

  /**
   * Generates a notification for an incoming transaction
   */
  gotIncomingTransaction = async (lastBlock) => {
    const {
      AccountTrackerController,
      TransactionController,
      PreferencesController,
    } = Engine.context;
    const { selectedAddress } = PreferencesController.state;
    const chainId = selectChainId(store.getState());

    /// Find the incoming TX
    const { transactions } = TransactionController.state;

    // If a TX has been confirmed more than 10 min ago, it's considered old
    const oldestTimeAllowed = Date.now() - 1000 * 60 * 10;

    if (transactions.length) {
      const txs = transactions
        .reverse()
        .filter(
          (tx) =>
            safeToChecksumAddress(tx.txParams?.to) === selectedAddress &&
            safeToChecksumAddress(tx.txParams?.from) !== selectedAddress &&
            tx.chainId === chainId &&
            tx.status === 'confirmed' &&
            lastBlock <= parseInt(tx.blockNumber, 10) &&
            tx.time > oldestTimeAllowed,
        );
      if (txs.length > 0) {
        this._showNotification({
          type: 'received',
          transaction: {
            nonce: `${hexToBN(txs[0].txParams.nonce).toString()}`,
            amount: `${renderFromWei(hexToBN(txs[0].txParams.value))}`,
            id: txs[0]?.id,
            assetType: strings('unit.eth'),
          },
          autoHide: true,
          duration: 7000,
        });
      }
    }
    // Update balance upon detecting a new incoming transaction
    AccountTrackerController.refresh();
  };
}

let instance;

export default {
  init({
    navigation,
    showTransactionNotification,
    hideCurrentNotification,
    showSimpleNotification,
    removeNotificationById,
  }) {
    instance = new NotificationManager(
      navigation,
      showTransactionNotification,
      hideCurrentNotification,
      showSimpleNotification,
      removeNotificationById,
    );
    return instance;
  },
  watchSubmittedTransaction(transaction) {
    return instance?.watchSubmittedTransaction(transaction);
  },
  getTransactionToView() {
    return instance?.getTransactionToView();
  },
  setTransactionToView(id) {
    return instance?.setTransactionToView(id);
  },
  gotIncomingTransaction(lastBlock) {
    return instance?.gotIncomingTransaction(lastBlock);
  },
  requestPushNotificationsPermission() {
    return instance?.requestPushNotificationsPermission();
  },
  showSimpleNotification(data) {
    return instance?.showSimpleNotification(data);
  },
  onMessageReceived(data) {
    return instance?.onMessageReceived(data);
  },
};
