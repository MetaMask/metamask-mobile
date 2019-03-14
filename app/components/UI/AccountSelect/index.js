import React, { Component } from 'react';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { hexToBN } from 'gaba/util';
import { toChecksumAddress } from 'ethereumjs-util';
import { weiToFiat, renderFromWei } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { ScrollView } from 'react-native-gesture-handler';

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
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		elevation: 11
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
		color: colors.inputBorderColor,
		position: 'absolute',
		right: 10,
		top: 25
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
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
 * Component that renders a select element populated with accounts from the current keychain
 */
class AccountSelect extends Component {
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
		value: PropTypes.string
	};

	static defaultProps = {
		enabled: true
	};

	state = { isOpen: false };

	componentDidMount() {
		const { onChange, selectedAddress } = this.props;
		onChange && onChange(selectedAddress);
	}

	renderActiveOption() {
		const { selectedAddress, accounts, identities, value } = this.props;
		const targetAddress = toChecksumAddress(value || selectedAddress);
		const account = { ...identities[targetAddress], ...accounts[targetAddress] };
		return (
			<View style={styles.activeOption}>
				{this.props.enabled && <MaterialIcon name={'arrow-drop-down'} size={24} style={styles.arrow} />}
				{this.renderOption(account, () => {
					this.setState({ isOpen: !this.state.isOpen });
				})}
			</View>
		);
	}

	renderOption(account, onPress) {
		const { conversionRate, currentCurrency } = this.props;
		const balance = hexToBN(account.balance);
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
					<Text style={styles.info}>
						{renderFromWei(balance)} {strings('unit.eth')}
					</Text>
					<Text style={styles.info}>{weiToFiat(balance, conversionRate, currentCurrency).toUpperCase()}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { accounts, identities, onChange } = this.props;
		return (
			<ScrollView style={styles.componentContainer}>
				<View style={styles.optionList}>
					{Object.keys(identities).map(address =>
						this.renderOption({ ...identities[address], ...accounts[address] }, () => {
							this.setState({ isOpen: false, value: address });
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
			{this.state.isOpen && this.props.enabled && this.renderOptionList()}
		</View>
	);
}

const mapStateToProps = ({
	engine: {
		backgroundState: { AccountTrackerController, CurrencyRateController, PreferencesController }
	}
}) => ({
	accounts: AccountTrackerController.accounts,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency,
	identities: PreferencesController.identities,
	selectedAddress: PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountSelect);
