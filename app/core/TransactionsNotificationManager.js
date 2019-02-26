'use strict';

import { showMessage, hideMessage } from 'react-native-flash-message';
import Engine from './Engine';

class TransactionsNotificationManager {
	constructor(_navigation) {
		if (!TransactionsNotificationManager.instance) {
			this.navigation = _navigation;
			TransactionsNotificationManager.instance = this;
		}
		return TransactionsNotificationManager.instance;
	}

	_viewTransaction = () => {
		this.navigation.navigate('WalletView', { page: 0 });
		setTimeout(() => {
			this.navigation.navigate('WalletView', { page: 2 });
		}, 300);
	};

	watchSubmittedTransaction(transaction) {
		const { TransactionController } = Engine.context;

		// First we show the pending tx notification
		showMessage({
			type: 'pending',
			autoHide: false
		});

		// We wait for confirmation
		this.confirmedHandler = TransactionController.hub.once(`${transaction.id}:confirmed`, transactionMeta => {
			// Once it's confirmed we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the success notification
				showMessage({
					type: 'success',
					message: {
						transaction: transactionMeta,
						callback: () => this._viewTransaction
					},
					autoHide: true,
					duration: 2000
				});

				// Clean up the other listener
				TransactionController.hub.removeListener(`${transaction.id}:finished`, this.errorHandler);
			}, 1000);
		});

		this.errorHandler = TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
			// If it fails we hide the pending tx notification
			hideMessage();
			setTimeout(() => {
				// Then we show the error notification
				showMessage({
					type: 'error',
					autoHide: true,
					message: {
						transaction: transactionMeta,
						callback: () => this._viewTransaction
					},
					duration: 2000
				});
				// Clean up the other listener
				TransactionController.hub.removeListener(`${transaction.id}:confirmed`, this.confirmedHandler);
			}, 1000);
		});
	}
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
	}
};
