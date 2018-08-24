import React, { Component } from 'react';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	input: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		fontSize: 16,
		fontWeight: '500',
		paddingBottom: 16,
		paddingLeft: 10,
		paddingRight: 10,
		paddingTop: 16,
		position: 'relative'
	},
	option: {
		flexDirection: 'row',
		paddingBottom: 4,
		paddingLeft: 8,
		paddingRight: 10,
		paddingTop: 8
	},
	address: {
		fontSize: 16
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
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		position: 'absolute',
		top: 52,
		width: '100%'
	},
	content: {
		flex: 1
	}
});

/**
 * Component that renders a combobox using available addresses
 */
class AccountInput extends Component {
	static propTypes = {
		/**
		 * List of accounts from the PreferencesController TODO: Update this
		 */
		accounts: PropTypes.object,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Callback triggered when the address changes
		 */
		onChange: PropTypes.func,
		/**
		 * Placeholder text to show inside this input
		 */
		placeholder: PropTypes.string,
		/**
		 * Current input value
		 */
		value: PropTypes.string
	};

	state = {
		isOpen: false,
		value: ''
	};

	selectAccount(account) {
		this.onChange(account.address);
	}

	focus = () => {
		this.setState({ isOpen: true });
	};

	renderOption(account, onPress) {
		const { conversionRate } = this.props;
		// TODO: Use real balances (should come from GABA)
		account.balance = 100;
		// TODO: Format currency externally
		account.formattedValue = parseFloat(Math.round(account.balance * conversionRate * 100) / 100).toFixed(2);
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
						<Text style={styles.address} numberOfLines={1}>
							{account.address}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { visibleOptions = this.props.accounts } = this.state;
		return (
			<View style={styles.optionList}>
				{Object.keys(visibleOptions).map(address =>
					this.renderOption(visibleOptions[address], () => {
						this.selectAccount(visibleOptions[address]);
					})
				)}
			</View>
		);
	}

	onChange = value => {
		const { accounts, onChange } = this.props;
		const addresses = Object.keys(accounts).filter(address => address.toLowerCase().match(value.toLowerCase()));
		const visibleOptions = value.length === 0 ? accounts : addresses.map(address => accounts[address]);
		const match = visibleOptions.length === 1 && visibleOptions[0].address.toLowerCase() === value.toLowerCase();
		this.setState({
			visibleOptions,
			isOpen: (value.length === 0 || visibleOptions.length) > 0 && !match
		});
		onChange && onChange(value);
	};

	render() {
		const { isOpen } = this.state;
		const { placeholder, value } = this.props;
		return (
			<View style={styles.root}>
				<TextInput
					autoCapitalize="none"
					autoCorrect={false}
					clearButtonMode="while-editing"
					onChangeText={this.onChange}
					onFocus={this.focus}
					placeholder={placeholder}
					spellCheck={false}
					style={styles.input}
					value={value}
				/>
				{isOpen && this.renderOptionList()}
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController, PreferencesController } }) => ({
	// TODO:  Use different account list that includes balances (from GABA)
	accounts: PreferencesController.identities,
	activeAddress: PreferencesController.selectedAddress,
	conversionRate: CurrencyRateController.conversionRate
});

export default connect(mapStateToProps)(AccountInput);
