const EventEmitter = require('events');
const log = require('loglevel');
const EthQuery = require('ethjs-query');
/**

  Event emitter utility class for tracking the transactions as they<br>
  go from a pending state to a confirmed (mined in a block) state<br>
<br>
  As well as continues broadcast while in the pending state
<br>
@param config {object} - non optional configuration object consists of:
    @param {Object} config.provider - A network provider.
    @param {Object} config.nonceTracker see nonce tracker
    @param {function} config.getPendingTransactions a function for getting an array of transactions,
    @param {function} config.publishTransaction a async function for publishing raw transactions,


@class
*/

class PendingTransactionTracker extends EventEmitter {
	constructor(config) {
		super();
		this.query = new EthQuery(config.provider);
		this.nonceTracker = config.nonceTracker;
		// default is one day
		this.getPendingTransactions = config.getPendingTransactions;
		this.getCompletedTransactions = config.getCompletedTransactions;
		this.publishTransaction = config.publishTransaction;
		this._checkPendingTxs();
	}

	/**
    checks if a signed tx is in a block and
    if it is included emits tx status as 'confirmed'
    @param block {object}, a full block
    @emits tx:confirmed
    @emits tx:failed
  */
	checkForTxInBlock(block) {
		const signedTxList = this.getPendingTransactions();
		if (!signedTxList.length) return;
		signedTxList.forEach(txMeta => {
			const txHash = txMeta.hash;
			const txId = txMeta.id;

			if (!txHash) {
				const noTxHashErr = new Error('We had an error while submitting this transaction, please try again.');
				noTxHashErr.name = 'NoTxHashError';
				this.emit('tx:failed', txId, noTxHashErr);
				return;
			}

			block.transactions.forEach(tx => {
				if (tx.hash === txHash) this.emit('tx:confirmed', txId);
			});
		});
	}

	/**
    asks the network for the transaction to see if a block number is included on it
    if we have skipped/missed blocks
    @param object - oldBlock newBlock
  */
	queryPendingTxs({ oldBlock, newBlock }) {
		// check pending transactions on start
		if (!oldBlock) {
			this._checkPendingTxs();
			return;
		}
		// if we synced by more than one block, check for missed pending transactions
		const diff = Number.parseInt(newBlock.number, 16) - Number.parseInt(oldBlock.number, 16);
		if (diff > 1) this._checkPendingTxs();
	}

	/**
    Will resubmit any transactions who have not been confirmed in a block
    @param block {object} - a block object
    @emits tx:warning
  */
	resubmitPendingTxs(block) {
		const pending = this.getPendingTransactions();
		// only try resubmitting if their are transactions to resubmit
		if (!pending.length) return;
		pending.forEach(txMeta =>
			this._resubmitTx(txMeta, block.number).catch(err => {
				/*
      Dont marked as failed if the error is a "known" transaction warning
      "there is already a transaction with the same sender-nonce
      but higher/same gas price"

      Also don't mark as failed if it has ever been broadcast successfully.
      A successful broadcast means it may still be mined.
      */
				const errorMessage = err.message.toLowerCase();
				const isKnownTx =
					// geth
					errorMessage.includes('replacement transaction underpriced') ||
					errorMessage.includes('known transaction') ||
					// parity
					errorMessage.includes('gas price too low to replace') ||
					errorMessage.includes('transaction with the same hash was already imported') ||
					// other
					errorMessage.includes('gateway timeout') ||
					errorMessage.includes('nonce too low');
				// ignore resubmit warnings, return early
				if (isKnownTx) return;
				// encountered real error - transition to error state
				txMeta.warning = {
					error: errorMessage,
					message: 'There was an error when resubmitting this transaction.'
				};
				this.emit('tx:warning', txMeta, err);
			})
		);
	}

	/**
    resubmits the individual txMeta used in resubmitPendingTxs
    @param txMeta {Object} - txMeta object
    @param latestBlockNumber {string} - hex string for the latest block number
    @emits tx:retry
    @returns txHash {string}
  */
	async _resubmitTx(txMeta, latestBlockNumber) {
		if (!txMeta.firstRetryBlockNumber) {
			this.emit('tx:block-update', txMeta, latestBlockNumber);
		}

		const firstRetryBlockNumber = txMeta.firstRetryBlockNumber || latestBlockNumber;
		const txBlockDistance = Number.parseInt(latestBlockNumber, 16) - Number.parseInt(firstRetryBlockNumber, 16);

		const retryCount = txMeta.retryCount || 0;

		// Exponential backoff to limit retries at publishing
		if (txBlockDistance <= Math.pow(2, retryCount) - 1) return;

		// Only auto-submit already-signed txs:
		if (!('rawTx' in txMeta)) return;

		const rawTx = txMeta.rawTx;
		const txHash = await this.publishTransaction(rawTx);

		// Increment successful tries:
		this.emit('tx:retry', txMeta);
		return txHash;
	}
	/**
    Ask the network for the transaction to see if it has been include in a block
    @param txMeta {Object} - the txMeta object
    @emits tx:failed
    @emits tx:confirmed
    @emits tx:warning
  */
	async _checkPendingTx(txMeta) {
		const txHash = txMeta.hash;
		const txId = txMeta.id;

		// extra check in case there was an uncaught error during the
		// signature and submission process
		if (!txHash) {
			const noTxHashErr = new Error('We had an error while submitting this transaction, please try again.');
			noTxHashErr.name = 'NoTxHashError';
			this.emit('tx:failed', txId, noTxHashErr);
			return;
		}

		// If another tx with the same nonce is mined, set as failed.
		const taken = await this._checkIfNonceIsTaken(txMeta);
		if (taken) {
			const nonceTakenErr = new Error('Another transaction with this nonce has been mined.');
			nonceTakenErr.name = 'NonceTakenErr';
			return this.emit('tx:failed', txId, nonceTakenErr);
		}

		// get latest transaction status
		let txParams;
		try {
			txParams = await this.query.getTransactionByHash(txHash);
			if (!txParams) return;
			if (txParams.blockNumber) {
				this.emit('tx:confirmed', txId);
			}
		} catch (err) {
			txMeta.warning = {
				error: err.message,
				message: 'There was a problem loading this transaction.'
			};
			this.emit('tx:warning', txMeta, err);
		}
	}

	/**
    checks the network for signed txs and releases the nonce global lock if it is
  */
	async _checkPendingTxs() {
		const signedTxList = this.getPendingTransactions();
		// in order to keep the nonceTracker accurate we block it while updating pending transactions
		const { releaseLock } = await this.nonceTracker.getGlobalLock();
		try {
			await Promise.all(signedTxList.map(txMeta => this._checkPendingTx(txMeta)));
		} catch (err) {
			log.error('PendingTransactionWatcher - Error updating pending transactions');
			log.error(err);
		}
		releaseLock();
	}

	/**
    checks to see if a confirmed txMeta has the same nonce
    @param txMeta {Object} - txMeta object
    @returns {boolean}
  */
	async _checkIfNonceIsTaken(txMeta) {
		const address = txMeta.txParams.from;
		const completed = this.getCompletedTransactions(address);
		const sameNonce = completed.filter(otherMeta => {
			return otherMeta.txParams.nonce === txMeta.txParams.nonce;
		});
		return sameNonce.length > 0;
	}
}

module.exports = PendingTransactionTracker;
