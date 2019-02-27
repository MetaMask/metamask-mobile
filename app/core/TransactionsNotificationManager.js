'use strict';

import { showMessage, hideMessage } from 'react-native-flash-message';
import Engine from './Engine';
import Networks, { isKnownNetwork } from '../util/networks';
import { toChecksumAddress } from 'ethereumjs-util';
import { hexToBN, renderFromWei } from '../util/number';
import { strings } from '../../locales/i18n';

class TransactionsNotificationManager {
	constructor(_navigation) {
		if (!TransactionsNotificationManager.instance) {
			this._navigation = _navigation;
			this._transactionsToView = [];
			TransactionsNotificationManager.instance = this;
		}

		return TransactionsNotificationManager.instance;
	}

	_viewTransaction = id => {
		this._transactionsToView.push(id);
		this._navigation.navigate('WalletView', { page: 0 });
		setTimeout(() => {
			this._navigation.navigate('WalletView', { page: 2 });
		}, 300);
	};

	_removeListeners = transactionId => {
		const { TransactionController } = Engine.context;
		TransactionController.hub.removeAllListeners(`${transactionId}:confirmed`);
		TransactionController.hub.removeAllListeners(`${transactionId}:finished`);
	};

	getTransactionToView = () => {
		const ret = this._transactionsToView.pop();
		return ret;
	};

	watchSubmittedTransaction(transaction) {
		const { TransactionController } = Engine.context;

		// First we show the pending tx notification
		showMessage({
			type: 'pending',
			autoHide: false,
			message: {}
		});

		// We wait for confirmation
		TransactionController.hub.once(`${transaction.id}:confirmed`, transactionMeta => {
			// Once it's confirmed we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the success notification
				showMessage({
					type: 'success',
					message: {
						transaction: {
							nonce: `${hexToBN(transactionMeta.transaction.nonce).toString()}`
						},
						callback: () => this._viewTransaction(transactionMeta.id)
					},
					autoHide: true,
					duration: 3000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);
			}, 500);
		});

		TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
			// If it fails we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the error notification
				showMessage({
					type: 'error',
					autoHide: true,
					message: {
						transaction: transactionMeta,
						callback: () => this._viewTransaction(transactionMeta.id)
					},
					duration: 3000
				});
				// Clean up
				this._removeListeners(transactionMeta.id);
			}, 500);
		});
	}

	gotIncomingTransaction = async lastBlock => {
		const { TransactionController, PreferencesController, NetworkController } = Engine.context;
		const { selectedAddress } = PreferencesController.state;
		const { type: networkType } = NetworkController.state.provider;

		/// Find the incoming TX
		const { transactions } = TransactionController.state;
		const { networkId } = Networks[networkType];

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
						lastBlock <= parseInt(tx.blockNumber, 10)
				);
			if (txs.length > 0) {
				showMessage({
					type: 'received',
					message: {
						transaction: {
							nonce: `${hexToBN(txs[0].transaction.nonce).toString()}`,
							amount: `${renderFromWei(hexToBN(txs[0].transaction.value))}`,
							assetType: strings('unit.eth')
						},
						callback: () => this._viewTransaction(txs[0].id)
					},
					autoHide: false,
					duration: 3000
				});
			}
		}
	};
}

let instance;

export default {
	init(_navigation) {
		instance = new TransactionsNotificationManager(_navigation);
		Object.freeze(instance);
		return instance;
	},
	watchSubmittedTransaction(transaction) {
		return instance.watchSubmittedTransaction(transaction);
	},
	getTransactionToView() {
		return instance.getTransactionToView();
	},
	gotIncomingTransaction(lastBlock) {
		return instance.gotIncomingTransaction(lastBlock);
	}
};
