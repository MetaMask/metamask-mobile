import { BN } from 'ethereumjs-util';
import Common from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';

function buildTxParams(_txParams) {
	const txParams = { ..._txParams, gasLimit: _txParams.gas };
	delete txParams.gas;
	return txParams;
}

function buildTransactionCommon(transaction) {
	// This produces a transaction whose information does not completely match an
	// Optimism transaction — for instance, DEFAULT_CHAIN is still 'mainnet' and
	// genesis points to the mainnet genesis, not the Optimism genesis — but
	// considering that all we want to do is serialize a transaction, this works
	// fine for our use case.
	return Common.forCustomChain('mainnet', {
		chainId: new BN(transaction.chainId, 10),
		networkId: new BN(transaction.networkId, 10),
		// Optimism only supports type-0 transactions; it does not support any of
		// the newer EIPs since EIP-155. Source:
		// <https://github.com/ethereum-optimism/optimism/blob/develop/specs/l2geth/transaction-types.md>
		defaultHardfork: 'spuriousDragon',
	});
}

export default function buildUnserializedTransaction(transaction) {
	const txParams = buildTxParams(transaction.transaction);
	const common = buildTransactionCommon(transaction);
	return TransactionFactory.fromTxData(txParams, { common });
}
