import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { renderAccountName, renderShortAddress } from '../../../util/address';
import { getTicker } from '../../../util/transactions';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	accountInformation: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16
	},
	identicon: {
		marginRight: 8
	},
	accountInfoRow: {
		flexGrow: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	accountNameAndAddress: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-start'
	},
	accountName: {
		maxWidth: Device.isMediumDevice() ? '35%' : '45%',
		...fontStyles.bold,
		fontSize: 16,
		marginRight: 2,
		color: colors.black
	},
	accountAddress: {
		flexGrow: 1,
		...fontStyles.bold,
		fontSize: 16,
		color: colors.black
	},
	balanceText: {
		...fontStyles.thin,
		fontSize: 14,
		alignSelf: 'flex-start',
		color: colors.black
	}
});

class AccountInfoCard extends PureComponent {
	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A number that specifies the ETH/USD conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * The selected currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Declares the operation being performed i.e. 'signing'
		 */
		operation: PropTypes.string,
		/**
		 * Current selected ticker
		 */
		ticker: PropTypes.string
	};

	render() {
		const {
			accounts,
			selectedAddress,
			identities,
			conversionRate,
			currentCurrency,
			operation,
			ticker
		} = this.props;
		const weiBalance = hexToBN(accounts[selectedAddress].balance);
		const balance = `(${renderFromWei(weiBalance)} ${getTicker(ticker)})`;
		const accountLabel = renderAccountName(selectedAddress, identities);
		const address = renderShortAddress(selectedAddress);
		const dollarBalance = weiToFiat(weiBalance, conversionRate, currentCurrency, 2).toUpperCase();
		return (
			<View style={styles.accountInformation}>
				<Identicon address={selectedAddress} diameter={40} customStyle={styles.identicon} />
				<View style={styles.accountInfoRow}>
					<View style={styles.accountNameAndAddress}>
						<Text numberOfLines={1} style={styles.accountName}>
							{accountLabel}
						</Text>
						<Text numberOfLines={1} style={styles.accountAddress}>
							({address})
						</Text>
					</View>
					{operation === 'signing' ? null : (
						<Text numberOfLines={1} style={styles.balanceText}>
							{strings('signature_request.balance_title')} {dollarBalance} {balance}
						</Text>
					)}
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(AccountInfoCard);
