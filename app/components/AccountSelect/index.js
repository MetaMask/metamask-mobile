import React, { Component } from 'react';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';
import { ethToFiat } from '../../util/number';

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
		paddingHorizontal: 10,
		paddingVertical: 8
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
 * Component that renders a select-style component populated with accounts from the current keychain
 */
class AccountSelect extends Component {
	static propTypes = {
		/**
		 * List of accounts from the PreferencesController
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
		onChange: PropTypes.func,
		/**
		 * Address of the currently-selected account
		 */
		value: PropTypes.string
	};

	state = { isOpen: false };

	renderActiveOption() {
		const { activeAddress, accounts, value } = this.props;
		const targetAddress = (value || activeAddress).toLowerCase();
		const account = accounts[targetAddress];
		return (
			<View style={styles.activeOption}>
				<MaterialIcon name={'keyboard-arrow-down'} size={18} style={styles.arrow} />
				{this.renderOption(account, () => {
					this.setState({ isOpen: !this.state.isOpen });
				})}
			</View>
		);
	}

	renderOption(account, onPress) {
		const { conversionRate, currentCurrency } = this.props;
		return (
			<TouchableOpacity
				key={account.address}
				onPress={onPress}
				style={styles.option}
			>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={18} />
				</View>
				<View style={styles.content}>
					<View>
						<Text style={styles.name}>{account.name}</Text>
					</View>
					<View>
						<Text style={styles.info}>{account.balance} ETH</Text>
					</View>
					<View>
						<Text style={styles.info}>
							{ethToFiat(account.balance, conversionRate, currentCurrency)}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { accounts, onChange } = this.props;
		return (
			<View style={styles.optionList}>
				{Object.keys(accounts).map(address =>
					this.renderOption(accounts[address], () => {
						this.setState({ isOpen: false, value: address });
						onChange && onChange(address);
					})
				)}
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
	// TODO: Update this to use balances
	accounts: PreferencesController.identities,
	activeAddress: PreferencesController.selectedAddress,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(AccountSelect);
