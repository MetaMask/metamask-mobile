import React, { Component } from 'react';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		zIndex: 100
	},
	activeOption: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		position: 'relative'
	},
	option: {
		flexDirection: 'row',
		paddingBottom: 4,
		paddingLeft: 10,
		paddingRight: 10,
		paddingTop: 8
	},
	info: {
		fontSize: 12,
		lineHeight: 16,
		textTransform: 'uppercase'
	},
	name: {
		fontSize: 16,
		fontWeight: '500',
		marginBottom: 4
	},
	icon: {
		paddingRight: 9,
		paddingTop: 1.5
	},
	arrow: {
		color: colors.inputBorderColor,
		position: 'absolute',
		right: 10,
		top: 10
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		position: 'absolute',
		top: 68,
		width: '100%',
		zIndex: 100
	}
});

/**
 * Component that renders a select-style component populated with available available accounts
 */
class AccountSelect extends Component {
	static propTypes = {
		/**
		 * List of accounts from the PreferencesController TODO: Update this
		 */
		accounts: PropTypes.object,
		/**
		 * Address of the currently-active account from the PreferencesController
		 */
		activeAddress: PropTypes.string,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code for currently-selcted currency from CurrencyRateController
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Callback triggered when a new address is selected
		 */
		onAddressChange: PropTypes.func,
		/**
		 * Currently-selected address in this Select
		 */
		selectedAddress: PropTypes.string
	};

	state = { isOpen: false };

	renderOption(account, onPress) {
		const { conversionRate, currentCurrency } = this.props;
		// TODO: Use real balances (should come from GABA)
		account.balance = 100;
		// TODO: Format currency externally
		account.formattedValue = parseFloat(Math.round(account.balance * conversionRate * 100) / 100).toFixed(2);
		return (
			<TouchableOpacity style={styles.option} onPress={() => { onPress() }}>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={18} />
				</View>
				<View style={styles.content}>
					<View><Text style={styles.name}>{account.name}</Text></View>
					<View><Text style={styles.info}>{account.balance} ETH</Text></View>
					<View><Text style={styles.info}>{account.formattedValue} {currentCurrency}</Text></View>
				</View>
			</TouchableOpacity>
		);
	}

	renderActiveOption() {
		const { activeAddress, accounts, selectedAddress } = this.props;
		const targetAddress = selectedAddress || activeAddress;
		const account = accounts[targetAddress];
		return (
			<View style={styles.activeOption}>
				<MaterialIcon name={'keyboard-arrow-down'} size={18} style={styles.arrow} />
				{this.renderOption(account, () => { this.setState({ isOpen: !this.state.isOpen }); })}
			</View>
		);
	}

	renderOptionList() {
		const { accounts, onAddressChange } = this.props;
		return (
			<View style={styles.optionList}>
				{Object.keys(accounts).map((address) => this.renderOption(accounts[address], () => {
					this.setState({ isOpen: false });
					onAddressChange && onAddressChange(address);
				}))}
			</View>
		);
	}

	render() {
		return (
			<View style={styles.root}>
				{this.renderActiveOption()}
				{this.state.isOpen && this.renderOptionList()}
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController, PreferencesController } }) => ({
	// TODO:  Use different account list that includes balances (from GABA)
	accounts: PreferencesController.identities,
	activeAddress:  PreferencesController.selectedAddress,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(AccountSelect);
