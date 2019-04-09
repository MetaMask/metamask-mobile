'use strict';

import { showMessage, hideMessage } from 'react-native-flash-message';
import PushNotification from 'react-native-push-notification';
import Engine from './Engine';
import Networks, { isKnownNetwork } from '../util/networks';
import { toChecksumAddress } from 'ethereumjs-util';
import { hexToBN, renderFromWei } from '../util/number';
import { strings } from '../../locales/i18n';
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import AppConstants from './AppConstants';

/**
 * Singleton class responsible for managing all the transaction
 * related notifications, which could be in-app or push
 * depending on the state of the app
 */
class TransactionsNotificationManager {
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

	_handleAppStateChange = appState => {
		this._backgroundMode = appState === 'background';
	};

	_viewTransaction = id => {
		this._transactionToView.push(id);
		this._navigation.navigate('TransactionsHome');
	};

	_removeListeners = transactionId => {
		const { TransactionController } = Engine.context;
		TransactionController.hub.removeAllListeners(`${transactionId}:confirmed`);
		TransactionController.hub.removeAllListeners(`${transactionId}:finished`);
	};

	_showNotification(data) {
		if (this._backgroundMode) {
			let title = '';
			let message = '';
			switch (data.type) {
				case 'pending':
					title = strings('notifications.pending_title');
					message = strings('notifications.pending_message');
					break;
				case 'success':
					title = strings('notifications.success_title', { nonce: data.message.transaction.nonce });
					message = strings('notifications.success_message');
					break;
				case 'error':
					title = strings('notifications.error_title');
					message = strings('notifications.error_message');
					break;
				case 'received':
					title = strings('notifications.received_title', {
						amount: data.message.transaction.amount,
						assetType: data.message.transaction.assetType
					});
					message = strings('notifications.received_message');
					break;
			}

			const pushData = {
				title,
				message,
				largeIcon: 'ic_notification',
				smallIcon: 'ic_notification_small'
			};

			const extraData = { action: 'tx', id: data.message.transaction.id };
			if (Platform.OS === 'android') {
				pushData.tag = JSON.stringify(extraData);
			} else {
				pushData.userInfo = extraData;
			}
			PushNotification.localNotification(pushData);

			this._transactionToView.push(data.message.transaction.id);
		} else {
			showMessage(data);
		}
	}

	/**
	 * Creates a TransactionsNotificationManager instance
	 */
	constructor(_navigation) {
		if (!TransactionsNotificationManager.instance) {
			this._navigation = _navigation;
			this._transactionToView = [];
			this._backgroundMode = false;
			TransactionsNotificationManager.instance = this;
			AppState.addEventListener('change', this._handleAppStateChange);
		}

		return TransactionsNotificationManager.instance;
	}

	/**
	 * Handles the push notification prompt
	 * with a custom set of rules, like max. number of attempts
	 */
	requestPushNotificationsPermission = async () => {
		const promptCount = await AsyncStorage.getItem('@MetaMask:pushNotificationsPromptCount');
		if (!promptCount || Number(promptCount) < AppConstants.MAX_PUSH_NOTIFICATION_PROMPT_TIMES) {
			PushNotification.checkPermissions(permissions => {
				if (!permissions || !permissions.alert) {
					Alert.alert(
						strings('notifications.prompt_title'),
						strings('notifications.prompt_desc'),
						[
							{
								text: strings('notifications.prompt_cancel'),
								onPress: () => false,
								style: 'default'
							},
							{
								text: strings('notifications.prompt_ok'),
								onPress: () => PushNotification.requestPermissions()
							}
						],
						{ cancelable: false }
					);

					const times = (promptCount && Number(promptCount) + 1) || 1;
					AsyncStorage.setItem('@MetaMask:pushNotificationsPromptCount', times.toString());
					// In case we want to prompt again after certain time.
					AsyncStorage.setItem('@MetaMask:pushNotificationsPromptTime', Date.now().toString());
				}
			});
		}
	};

	/**
	 * Returns the id of the transaction that should
	 * be displayed and removes it from memory
	 */
	getTransactionToView = () => this._transactionToView.pop();

	/**
	 * Sets the id of the transaction that should
	 * be displayed in memory
	 */
	setTransactionToView = id => {
		this._transactionToView.push(id);
	};

	/**
	 * Listen for events of a submitted transaction
	 * and generates the corresponding notification
	 * based on the status of the transaction (failed or confirmed)
	 */
	watchSubmittedTransaction(transaction) {
		const { TransactionController } = Engine.context;

		// First we show the pending tx notification
		this._showNotification({
			type: 'pending',
			autoHide: false,
			message: {
				transaction: {
					nonce: `${hexToBN(transaction.transaction.nonce).toString()}`,
					id: transaction.id
				},
				callback: () => this._viewTransaction(transaction.id)
			}
		});

		// We wait for confirmation
		TransactionController.hub.once(`${transaction.id}:confirmed`, transactionMeta => {
			// Once it's confirmed we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the success notification
				this._showNotification({
					type: 'success',
					message: {
						transaction: {
							nonce: `${hexToBN(transactionMeta.transaction.nonce).toString()}`,
							id: transactionMeta.id
						},
						callback: () => this._viewTransaction(transactionMeta.id)
					},
					autoHide: true,
					duration: 5000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);

				const { TokenBalancesController, AssetsDetectionController, AccountTrackerController } = Engine.context;
				// Detect assets and tokens and account balances
				// right after a transaction was confirmed
				Promise.all([
					AccountTrackerController.poll(),
					TokenBalancesController.poll(),
					AssetsDetectionController.poll()
				]);

				Platform.OS === 'ios' &&
					setTimeout(() => {
						this.requestPushNotificationsPermission();
					}, 7000);
			}, 500);
		});

		TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
			// If it fails we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the error notification
				this._showNotification({
					type: 'error',
					autoHide: true,
					message: {
						transaction: transactionMeta,
						id: transactionMeta.id,
						callback: () => this._viewTransaction(transactionMeta.id)
					},
					duration: 5000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);
			}, 500);
		});
	}

	/**
	 * Generates a notification for an incoming transaction
	 */
	gotIncomingTransaction = async lastBlock => {
		const { TransactionController, PreferencesController, NetworkController } = Engine.context;
		const { selectedAddress } = PreferencesController.state;
		const { type: networkType } = NetworkController.state.provider;

		/// Find the incoming TX
		const { transactions } = TransactionController.state;
		const { networkId } = Networks[networkType];

		// If a TX has been confirmed more than 10 min ago, it's considered old
		const oldestTimeAllowed = Date.now() - 1000 * 60 * 10;

		if (transactions.length) {
			const txs = transactions
				.reverse()
				.filter(
					tx =>
						tx.transaction.to &&
						toChecksumAddress(tx.transaction.to) === selectedAddress &&
						toChecksumAddress(tx.transaction.from) !== selectedAddress &&
						((networkId && networkId.toString() === tx.networkID) ||
							(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
						tx.status === 'confirmed' &&
						lastBlock <= parseInt(tx.blockNumber, 10) &&
						tx.time > oldestTimeAllowed
				);
			if (txs.length > 0) {
				this._showNotification({
					type: 'received',
					message: {
						transaction: {
							nonce: `${hexToBN(txs[0].transaction.nonce).toString()}`,
							amount: `${renderFromWei(hexToBN(txs[0].transaction.value))}`,
							assetType: strings('unit.eth'),
							id: txs[0].id
						},
						callback: () => this._viewTransaction(txs[0].id)
					},
					autoHide: true,
					duration: 5000
				});
			}
		}

		// Update balance upon detecting
		// a new incoming transaction
		const { AccountTrackerController } = Engine.context;
		AccountTrackerController.poll();
	};
}

let instance;

export default {
	init(_navigation) {
		instance = new TransactionsNotificationManager(_navigation);
		return instance;
	},
	watchSubmittedTransaction(transaction) {
		return instance.watchSubmittedTransaction(transaction);
	},
	getTransactionToView() {
		return instance.getTransactionToView();
	},
	setTransactionToView(id) {
		return instance.setTransactionToView(id);
	},
	gotIncomingTransaction(lastBlock) {
		return instance.gotIncomingTransaction(lastBlock);
	},
	requestPushNotificationsPermission() {
		return instance.requestPushNotificationsPermission();
	}
};
