const version = 19;

/*

This migration sets transactions as failed
whos nonce is too high

*/

const clone = require('clone');

module.exports = {
	version,

	migrate: function(originalVersionedData) {
		const versionedData = clone(originalVersionedData);
		versionedData.meta.version = version;
		try {
			const state = versionedData.data;
			const newState = transformState(state);
			versionedData.data = newState;
		} catch (err) {
			console.warn(`MetaMask Migration #${version}` + err.stack);
		}
		return Promise.resolve(versionedData);
	}
};

function transformState(state) {
	const newState = state;
	const { TransactionController } = newState;
	if (TransactionController && TransactionController.transactions) {
		const transactions = newState.TransactionController.transactions;

		newState.TransactionController.transactions = transactions.map((txMeta, _, txList) => {
			if (txMeta.status !== 'submitted') return txMeta;

			const confirmedTxs = txList
				.filter(tx => tx.status === 'confirmed')
				.filter(tx => tx.txParams.from === txMeta.txParams.from)
				.filter(tx => tx.metamaskNetworkId.from === txMeta.metamaskNetworkId.from);
			const highestConfirmedNonce = getHighestNonce(confirmedTxs);

			const pendingTxs = txList
				.filter(tx => tx.status === 'submitted')
				.filter(tx => tx.txParams.from === txMeta.txParams.from)
				.filter(tx => tx.metamaskNetworkId.from === txMeta.metamaskNetworkId.from);
			const highestContinuousNonce = getHighestContinuousFrom(pendingTxs, highestConfirmedNonce);

			const maxNonce = Math.max(highestContinuousNonce, highestConfirmedNonce);

			if (parseInt(txMeta.txParams.nonce, 16) > maxNonce + 1) {
				txMeta.status = 'failed';
				txMeta.err = {
					message: 'nonce too high',
					note: 'migration 019 custom error'
				};
			}
			return txMeta;
		});
	}
	return newState;
}

function getHighestContinuousFrom(txList, startPoint) {
	const nonces = txList.map(txMeta => {
		const nonce = txMeta.txParams.nonce;
		return parseInt(nonce, 16);
	});

	let highest = startPoint;
	while (nonces.includes(highest)) {
		highest++;
	}

	return highest;
}

function getHighestNonce(txList) {
	const nonces = txList.map(txMeta => {
		const nonce = txMeta.txParams.nonce;
		return parseInt(nonce || '0x0', 16);
	});
	const highestNonce = Math.max.apply(null, nonces);
	return highestNonce;
}
