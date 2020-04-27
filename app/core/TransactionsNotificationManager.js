'use strict';

import PushNotification from 'react-native-push-notification';
import Engine from './Engine';
import Networks, { isKnownNetwork } from '../util/networks';
import { toChecksumAddress } from 'ethereumjs-util';
import { hexToBN, renderFromWei } from '../util/number';
import Device from '../util/Device';
import { strings } from '../../locales/i18n';
import { Alert, AppState } from 'react-native';
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
	_showTransactionNotification;
	_hideTransactionNotification;
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

	_handleAppStateChange = appState => {
		this._backgroundMode = appState === 'background';
	};

	_viewTransaction = id => {
		this._transactionToView.push(id);
		this.goTo('TransactionsHome');
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
			let nonce = '';

			if (data && data.transaction && data.transaction.nonce) {
				nonce = data.transaction.nonce;
			}

			switch (data.type) {
				case 'pending':
					title = strings('notifications.pending_title');
					message = strings('notifications.pending_message');
					break;
				case 'pending_deposit':
					title = strings('notifications.pending_deposit_title');
					message = strings('notifications.pending_deposit_message');
					break;
				case 'pending_withdrawal':
					title = strings('notifications.pending_withdrawal_title');
					message = strings('notifications.pending_withdrawal_message');
					break;
				case 'success':
					title = strings('notifications.success_title', { nonce });
					message = strings('notifications.success_message');
					break;
				case 'speedup':
					title = strings('notifications.speedup_title', { nonce });
					message = strings('notifications.speedup_message');
					break;
				case 'success_withdrawal':
					title = strings('notifications.success_withdrawal_title');
					message = strings('notifications.success_withdrawal_message');
					break;
				case 'success_deposit':
					title = strings('notifications.success_deposit_title');
					message = strings('notifications.success_deposit_message');
					break;
				case 'error':
					title = strings('notifications.error_title');
					message = strings('notifications.error_message');
					break;
				case 'cancelled':
					title = strings('notifications.cancelled_title');
					message = strings('notifications.cancelled_message');
					break;
				case 'received':
					title = strings('notifications.received_title', {
						amount: data.transaction.amount,
						assetType: data.transaction.assetType
					});
					message = strings('notifications.received_message');
					break;
				case 'received_payment':
					title = strings('notifications.received_payment_title');
					message = strings('notifications.received_payment_message', {
						amount: data.transaction.amount
					});
					break;
			}

			const pushData = {
				title,
				message,
				largeIcon: 'ic_notification',
				smallIcon: 'ic_notification_small'
			};

			const id = (data && data.transaction && data.transaction.id) || null;

			const extraData = { action: 'tx', id };
			if (Device.isAndroid()) {
				pushData.tag = JSON.stringify(extraData);
			} else {
				pushData.userInfo = extraData;
			}
			PushNotification.localNotification(pushData);

			if (id) {
				this._transactionToView.push(id);
			}
		} else {
			this._showTransactionNotification({
				autodismiss: data.duration,
				transaction: data.transaction,
				status: data.type
			});
		}
	}

	_handleTransactionsWatchListUpdate = transactionMeta => {
		const nonce = transactionMeta.transaction.nonce;
		if (this._transactionsWatchTable[nonce]) {
			// Clean up of other txs listeners
			this._transactionsWatchTable[nonce].forEach(id => {
				if (id !== transactionMeta.id) {
					this._removeListeners(id);
				}
			});
			this._transactionsWatchTable[nonce] = this._transactionsWatchTable[nonce].filter(
				id => id === transactionMeta.id
			);
		}
	};

	_finishedCallback = transactionMeta => {
		this._handleTransactionsWatchListUpdate(transactionMeta);
		// If it fails we hide the pending tx notification
		this._hideTransactionNotification(transactionMeta.id);
		this._transactionsWatchTable[transactionMeta.transaction.nonce].length &&
			setTimeout(() => {
				// Then we show the error notification
				this._showNotification({
					type: transactionMeta.status === 'cancelled' ? 'cancelled' : 'error',
					autoHide: true,
					transaction: { id: transactionMeta.id },
					duration: 5000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);
				delete this._transactionsWatchTable[transactionMeta.transaction.nonce];
			}, 2000);
	};

	_confirmedCallback = (transactionMeta, originalTransaction) => {
		this._handleTransactionsWatchListUpdate(transactionMeta);
		// Once it's confirmed we hide the pending tx notification
		this._hideTransactionNotification(transactionMeta.id);
		this._transactionsWatchTable[transactionMeta.transaction.nonce].length &&
			setTimeout(() => {
				// Then we show the success notification
				this._showNotification({
					type: 'success',
					transaction: {
						id: transactionMeta.id
					},
					duration: 5000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);

				const { TokenBalancesController, AssetsDetectionController, AccountTrackerController } = Engine.context;
				// account balances for ETH txs
				// Detect assets and tokens for ERC20 txs
				// Detect assets for ERC721 txs
				// right after a transaction was confirmed
				const pollPromises = [AccountTrackerController.poll()];
				switch (originalTransaction.assetType) {
					case 'ERC20': {
						pollPromises.push(...[TokenBalancesController.poll(), AssetsDetectionController.poll()]);
						break;
					}
					case 'ERC721':
						pollPromises.push(AssetsDetectionController.poll());
						break;
				}
				Promise.all(pollPromises);

				Device.isIos() &&
					setTimeout(() => {
						this.requestPushNotificationsPermission();
					}, 7000);

				this._removeListeners(transactionMeta.id);
				delete this._transactionsWatchTable[transactionMeta.transaction.nonce];
			}, 2000);
	};

	_speedupCallback = transactionMeta => {
		this.watchSubmittedTransaction(transactionMeta, true);
		setTimeout(() => {
			this._showNotification({
				autoHide: false,
				type: 'speedup',
				transaction: {
					id: transactionMeta.id
				}
			});
		}, 2000);
	};

	/**
	 * Creates a TransactionsNotificationManager instance
	 */
	constructor(_navigation, _showTransactionNotification, _hideTransactionNotification) {
		if (!TransactionsNotificationManager.instance) {
			this._navigation = _navigation;
			this._showTransactionNotification = _showTransactionNotification;
			this._hideTransactionNotification = _hideTransactionNotification;
			this._transactionToView = [];
			this._backgroundMode = false;
			TransactionsNotificationManager.instance = this;
			AppState.addEventListener('change', this._handleAppStateChange);
		}

		return TransactionsNotificationManager.instance;
	}

	/**
	 * Navigates to a specific view
	 */
	goTo(view) {
		this._navigation.navigate(view);
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
	watchSubmittedTransaction(transaction, speedUp = false) {
		if (transaction.silent) return false;
		const { TransactionController } = Engine.context;
		const nonce = transaction.transaction.nonce;
		// First we show the pending tx notification if is not an speed up tx
		!speedUp &&
			this._showNotification({
				type: 'pending',
				autoHide: false,
				transaction: {
					id: transaction.id
				}
			});

		this._transactionsWatchTable[nonce]
			? this._transactionsWatchTable[nonce].push(transaction.id)
			: (this._transactionsWatchTable[nonce] = [transaction.id]);

		TransactionController.hub.once(`${transaction.id}:confirmed`, transactionMeta => {
			this._confirmedCallback(transactionMeta, transaction);
		});
		TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
			this._finishedCallback(transactionMeta);
		});
		TransactionController.hub.once(`${transaction.id}:speedup`, transactionMeta => {
			this._speedupCallback(transactionMeta);
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
					transaction: {
						nonce: `${hexToBN(txs[0].transaction.nonce).toString()}`,
						amount: `${renderFromWei(hexToBN(txs[0].transaction.value))}`,
						id: txs[0].id,
						assetType: strings('unit.eth')
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
	init(_navigation, _showTransactionNotification, _hideTransactionNotification) {
		instance = new TransactionsNotificationManager(
			_navigation,
			_showTransactionNotification,
			_hideTransactionNotification
		);
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
	},
	showInstantPaymentNotification(type) {
		// handle this
		this._hideTransactionNotification();
		setTimeout(() => {
			const notification = {
				type,
				autoHide: type.indexOf('success') !== -1,
				message: {
					transaction: null,
					callback: () => null
				}
			};
			if (notification.autoHide) {
				notification.duration = 5000;
			}

			return instance._showNotification(notification);
		}, 300);
	},
	showIncomingPaymentNotification: amount =>
		instance._showNotification({
			type: 'received_payment',
			message: {
				transaction: {
					amount,
					assetType: ''
				},
				callback: () => instance.goTo('PaymentChannelHome')
			},
			autoHide: true,
			duration: 5000
		})
};
