import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withNavigation } from '@react-navigation/compat';
import Engine from '../../../core/Engine';
import { showAlert } from '../../../actions/alert';
import Transactions from '../../UI/Transactions';
import { safeToChecksumAddress } from '../../../util/address';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
});

const TransactionsView = ({
	navigation,
	conversionRate,
	selectedAddress,
	identities,
	networkType,
	currentCurrency,
	transactions,
	chainId,
	tokens,
}) => {
	const [allTransactions, setAllTransactions] = useState([]);
	const [submittedTxs, setSubmittedTxs] = useState([]);
	const [confirmedTxs, setConfirmedTxs] = useState([]);
	const [loading, setLoading] = useState();

	const filterTransactions = useCallback(() => {
		const network = Engine.context.NetworkController.state.network;
		if (network === 'loading') return;

		let accountAddedTimeInsertPointFound = false;
		const addedAccountTime = identities[selectedAddress]?.importTime;

		const ethFilter = (tx) => {
			const {
				transaction: { from, to },
				isTransfer,
				transferInformation,
			} = tx;
			if (
				(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
				(chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
				tx.status !== 'unapproved'
			) {
				if (isTransfer)
					return tokens.find(({ address }) =>
						toLowerCaseEquals(address, transferInformation.contractAddress)
					);
				return true;
			}
			return false;
		};

		const submittedTxs = [];
		const newPendingTxs = [];
		const confirmedTxs = [];

		const allTransactionsSorted = transactions.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));

		const allTransactions = allTransactionsSorted.filter((tx) => {
			const filter = ethFilter(tx);
			if (!filter) return false;

			tx.insertImportTime = addAccountTimeFlagFilter(tx, addedAccountTime, accountAddedTimeInsertPointFound);
			if (tx.insertImportTime) accountAddedTimeInsertPointFound = true;

			switch (tx.status) {
				case 'submitted':
				case 'signed':
				case 'unapproved':
					submittedTxs.push(tx);
					return false;
				case 'pending':
					newPendingTxs.push(tx);
					break;
				case 'confirmed':
					confirmedTxs.push(tx);
					break;
			}
			return filter;
		});

		const submittedNonces = [];
		const submittedTxsFiltered = submittedTxs.filter((transaction) => {
			const alreadySubmitted = submittedNonces.includes(transaction.transaction.nonce);
			const alreadyConfirmed = confirmedTxs.find(
				(tx) =>
					safeToChecksumAddress(tx.transaction.from) === selectedAddress &&
					tx.transaction.nonce === transaction.transaction.nonce
			);
			if (alreadyConfirmed) {
				return false;
			}
			submittedNonces.push(transaction.transaction.nonce);
			return !alreadySubmitted;
		});

		//if the account added insertpoint is not found add it to the last transaction
		if (!accountAddedTimeInsertPointFound && allTransactions && allTransactions.length) {
			allTransactions[allTransactions.length - 1].insertImportTime = true;
		}
		setAllTransactions(allTransactions);
		setSubmittedTxs(submittedTxsFiltered);
		setConfirmedTxs(confirmedTxs);
		setLoading(false);
	}, [transactions, identities, selectedAddress, tokens, chainId]);

	useEffect(() => {
		setLoading(true);
		/*
		Since this screen is always mounted and computations happen on this screen everytime the user changes network
		using the InteractionManager will help by giving enough time for any animations/screen transactions before it starts
		computing the transactions which will make the app feel more responsive. Also this takes usually less than 1 seconds
		so the effect will not be noticeable if the user is in this screen.
		*/
		InteractionManager.runAfterInteractions(() => {
			filterTransactions();
		});
	}, [filterTransactions]);

	return (
		<View style={styles.wrapper} testID={'wallet-screen'}>
			<Transactions
				navigation={navigation}
				transactions={allTransactions}
				submittedTransactions={submittedTxs}
				confirmedTransactions={confirmedTxs}
				conversionRate={conversionRate}
				currentCurrency={currentCurrency}
				selectedAddress={selectedAddress}
				networkType={networkType}
				loading={loading}
			/>
		</View>
	);
};

TransactionsView.propTypes = {
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	/* Identities object required to get account name
	*/
	identities: PropTypes.object,
	/**
	/* navigation object required to push new views
	*/
	navigation: PropTypes.object,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * An array that represents the user transactions
	 */
	transactions: PropTypes.array,
	/**
	 * A string represeting the network name
	 */
	networkType: PropTypes.string,
	/**
	 * Array of ERC20 assets
	 */
	tokens: PropTypes.array,
	/**
	 * Current chainId
	 */
	chainId: PropTypes.string,
};

const mapStateToProps = (state) => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.TokensController.tokens,
	identities: state.engine.backgroundState.PreferencesController.identities,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withNavigation(TransactionsView));
