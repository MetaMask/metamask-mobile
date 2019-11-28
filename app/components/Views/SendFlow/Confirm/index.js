import React, { PureComponent } from 'react';
import { colors } from '../../../../styles/common';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import { connect } from 'react-redux';
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
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Current transaction state
		 */
		transactionState: PropTypes.object
	};

	state = {
		fromAccountBalance: undefined
	};

	componentDidMount = () => {
		const { accounts, ticker, contractBalances, transactionState } = this.props;
		const {
			selectedAsset,
			transaction: { from }
		} = transactionState;
		let fromAccountBalance;
		if (selectedAsset.isEth) {
			fromAccountBalance = `${renderFromWei(accounts[from].balance)} ${getTicker(ticker)}`;
		} else {
			fromAccountBalance = `${renderFromTokenMinimalUnit(
				contractBalances[selectedAsset.address],
				selectedAsset.decimals
			)} ${selectedAsset.symbol}`;
		}
		this.setState({ fromAccountBalance });
	};

	render = () => {
		const {
			transaction: { from },
			transactionTo,
			transactionToName,
			transactionFromName
		} = this.props.transactionState;
		const { fromAccountBalance } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
						fromAccountAddress={from}
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
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transactionState: state.newTransaction
});

export default connect(mapStateToProps)(Confirm);
