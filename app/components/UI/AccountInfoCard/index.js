import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { renderFromWei } from '../../../util/number';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { renderAccountName } from '../../../util/address';

const styles = StyleSheet.create({
	AccountInfoCard: {
		flex: baseStyles.flexGrow,
		justifyContent: 'center',
		alignItems: 'center'
	},
	accountInformation: {
		width: '90%',
		flex: baseStyles.flexGrow,
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		height: 60,
		marginTop: 20,
		marginBottom: 20,
		paddingLeft: 10,
		paddingRight: 10
	},
	identiconWrapper: {
		flex: baseStyles.flexGrow,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 5,
		marginRight: 10
	},
	accountInfoRow: {
		flex: 8,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	accountText: {
		...fontStyles.normal,
		fontSize: 16,
		paddingTop: 5
	},
	balanceText: {
		...fontStyles.light,
		fontSize: 14,
		paddingBottom: 5
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
			<View style={styles.AccountInfoCard}>
				<View style={styles.accountInformation}>
					<View style={styles.identiconWrapper}>
						<Identicon address={selectedAddress} diameter={35} />
					</View>
					<View style={styles.accountInfoRow}>
						<Text numberOfLines={1} style={styles.accountText}>
							{accountLabel}
						</Text>
						<Text numberOfLines={1} style={styles.balanceText}>
							{strings('signature_request.balance_title')} {balance} {strings('unit.eth')}
						</Text>
					</View>
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
