import React, { PureComponent } from 'react';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { hexToBN, weiToFiat, renderFromWei } from '../../../util/number';
import { getTicker } from '../../../util/transactions';
import InstaPay from '../../../core/InstaPay';
import { strings } from '../../../../locales/i18n';
import { safeToChecksumAddress } from '../../../util/address';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	componentContainer: {
		position: 'absolute',
		zIndex: 100,
		width: '100%',
		marginTop: 75,
		maxHeight: 200,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		elevation: 11
	},
	activeOption: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
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
		...fontStyles.normal,
		fontSize: 12,
		lineHeight: 16
	},
	name: {
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 4
	},
	icon: {
		paddingRight: 8,
		paddingLeft: 2,
		paddingTop: 1.5
	},
	content: {
		flex: 1,
		paddingHorizontal: 8
	},
	arrow: {
		color: colors.grey100,
		position: 'absolute',
		right: 10,
		top: 25
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		top: 0,
		left: 0,
		right: 0,
		elevation: 10,
		width: '100%'
	}
});

/**
 * PureComponent that renders a select element populated with accounts from the current keychain
 */
class AccountSelect extends PureComponent {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * Address of the currently-active account from the PreferencesController
		 */
		selectedAddress: PropTypes.string,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code for currently-selected currency from CurrencyRateController
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Whether selectable dropdown is enabled or not
		 */
		enabled: PropTypes.bool,
		/**
		 * Callback triggered when a new address is selected
		 */
		onChange: PropTypes.func,
		/**
		 * Address of the currently-selected account
		 */
		value: PropTypes.string,
		/**
		 * Callback to open accounts dropdown
		 */
		openAccountSelect: PropTypes.func,
		/**
		 * Whether accounts dropdown is opened
		 */
		isOpen: PropTypes.bool,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object
	};

	static defaultProps = {
		enabled: true
	};

	componentDidMount() {
		const { onChange, selectedAddress } = this.props;
		onChange && onChange(selectedAddress);
	}

	renderActiveOption() {
		const { selectedAddress, accounts, identities, value, isOpen, openAccountSelect } = this.props;
		const targetAddress = safeToChecksumAddress(value) || selectedAddress;
		const account = { ...identities[targetAddress], ...accounts[targetAddress] };
		return (
			<View style={styles.activeOption}>
				{this.props.enabled && <MaterialIcon name={'arrow-drop-down'} size={24} style={styles.arrow} />}
				{this.renderOption(account, () => {
					openAccountSelect && openAccountSelect(!isOpen);
				})}
			</View>
		);
	}

	renderOption(account, onPress) {
		const {
			conversionRate,
			currentCurrency,
			primaryCurrency,
			ticker,
			transaction: { paymentChannelTransaction }
		} = this.props;
		const balance = hexToBN(account.balance);

		// render balances according to selected 'primaryCurrency'
		let mainBalance, secondaryBalance;
		if (paymentChannelTransaction) {
			const state = InstaPay.getState();
			mainBalance = `${state.balance} ${strings('unit.dai')}`;
		} else if (primaryCurrency === 'ETH') {
			mainBalance = `${renderFromWei(balance)} ${getTicker(ticker)}`;
			secondaryBalance = weiToFiat(balance, conversionRate, currentCurrency);
		} else {
			mainBalance = weiToFiat(balance, conversionRate, currentCurrency);
			secondaryBalance = `${renderFromWei(balance)} ${getTicker(ticker)}`;
		}

		return (
			<TouchableOpacity
				key={account.address}
				onPress={onPress}
				disabled={!this.props.enabled}
				style={styles.option}
			>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={22} />
				</View>
				<View style={styles.content}>
					<Text numberOfLines={1} style={styles.name}>
						{account.name}
					</Text>
					<Text style={styles.info}>{mainBalance}</Text>
					{!!secondaryBalance && <Text style={styles.info}>{secondaryBalance}</Text>}
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { accounts, identities, onChange, openAccountSelect } = this.props;
		return (
			<ScrollView style={styles.componentContainer}>
				<View style={styles.optionList}>
					{Object.keys(identities).map(address =>
						this.renderOption({ ...identities[address], ...accounts[address] }, () => {
							this.setState({ value: address });
							openAccountSelect && openAccountSelect(true);
							onChange && onChange(address);
						})
					)}
				</View>
			</ScrollView>
		);
	}

	render = () => (
		<View style={styles.root}>
			{this.renderActiveOption()}
			{this.props.isOpen && this.props.enabled && this.renderOptionList()}
		</View>
	);
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	identities: state.engine.backgroundState.PreferencesController.identities,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	primaryCurrency: state.settings.primaryCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: state.transaction
});

export default connect(mapStateToProps)(AccountSelect);
