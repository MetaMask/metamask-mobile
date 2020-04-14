import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles, baseStyles } from '../../../styles/common';
import { renderFromWei } from '../../../util/number';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { renderAccountName } from '../../../util/address';

const styles = StyleSheet.create({
	text: {
		...fontStyles.normal,
		fontSize: 16,
		padding: 5
	},
	accountInformation: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		margin: 20,
		marginBottom: 40
	},
	accountInfoCol: {
		flex: 1,
		height: 40
	},
	account: {
		flex: 1,
		flexDirection: 'row'
	},
	identicon: {
		padding: 5
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
		selectedAddress: PropTypes.string
	};

	render() {
		const { accounts, selectedAddress, identities } = this.props;
		const balance = renderFromWei(accounts[selectedAddress].balance);
		const accountLabel = renderAccountName(selectedAddress, identities);
		return (
			<View style={styles.accountInformation}>
				<View style={styles.accountInfoCol}>
					<Text>{strings('signature_request.account_title')}</Text>
					<View style={[styles.account, baseStyles.flexGrow]}>
						<View style={[styles.identicon]}>
							<Identicon address={selectedAddress} diameter={20} />
						</View>
						<View style={baseStyles.flexGrow}>
							<Text numberOfLines={1} style={styles.text}>
								{accountLabel}
							</Text>
						</View>
					</View>
				</View>
				<View style={styles.accountInfoCol}>
					<Text>{strings('signature_request.balance_title')}</Text>
					<Text style={styles.text}>
						{balance} {strings('unit.eth')}
					</Text>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

export default connect(mapStateToProps)(AccountInfoCard);
