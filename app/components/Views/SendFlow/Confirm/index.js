import React, { PureComponent } from 'react';
import { colors } from '../../../../styles/common';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import { connect } from 'react-redux';
import { setRecipient, newTransaction } from '../../../../actions/newTransaction';
import { getSendFlowTitle } from '../../../UI/Navbar';
import { AddressFrom, AddressTo } from '../AddressInputs';
import PropTypes from 'prop-types';
import { renderFromWei, renderFromTokenMinimalUnit } from '../../../../util/number';
import { getTicker } from '../../../../util/transactions';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.confirm', navigation);

	static propTypes = {
		accounts: PropTypes.object,
		/**
		 */
		contractBalances: PropTypes.object,
		transactionTo: PropTypes.string,
		transactionFrom: PropTypes.string,
		selectedAsset: PropTypes.object,
		transactionToName: PropTypes.string,
		transactionFromName: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		fromAccountBalance: undefined
	};

	componentDidMount = () => {
		const { transactionFrom, selectedAsset, accounts, ticker, contractBalances } = this.props;
		let fromAccountBalance;
		if (selectedAsset.isEth) {
			fromAccountBalance = `${renderFromWei(accounts[transactionFrom].balance)} ${getTicker(ticker)}`;
		} else {
			fromAccountBalance = `${renderFromTokenMinimalUnit(
				contractBalances[selectedAsset.address],
				selectedAsset.decimals
			)} ${selectedAsset.symbol}`;
		}
		this.setState({ fromAccountBalance });
	};

	render = () => {
		const { transactionFrom, transactionTo, transactionToName, transactionFromName } = this.props;
		const { fromAccountBalance } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
						fromAccountAddress={transactionFrom}
						fromAccountName={transactionFromName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo
						addressToReady
						toSelectedAddress={transactionTo}
						toAddressName={transactionToName}
						onToSelectedAddressChange={this.onToSelectedAddressChange}
					/>
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network,
	transactionTo: state.newTransaction.transactionTo,
	transactionToName: state.newTransaction.transactionToName,
	transactionFrom: state.newTransaction.transaction.from,
	transactionFromName: state.newTransaction.transactionFromName,
	transaction: state.newTransaction.transaction,
	selectedAsset: state.newTransaction.selectedAsset
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setRecipient: (from, to, ensRecipient) => dispatch(setRecipient(from, to, ensRecipient))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
