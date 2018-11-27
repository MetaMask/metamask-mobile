import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { fromWei } from '../../util/number';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
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
	signingInformation: {
		margin: 20
	},
	account: {
		flex: 1,
		flexDirection: 'row'
	},
	identicon: {
		padding: 5
	},
	warningText: {
		...fontStyles.normal,
		color: colors.red,
		textAlign: 'center',
		padding: 10
	},
	signText: {
		...fontStyles.normal,
		fontSize: 16,
		padding: 5,
		textAlign: 'center'
	},
	header: {},
	signatureText: {
		...fontStyles.normal,
		textAlign: 'center',
		fontSize: 20,
		padding: 10,
		color: colors.black
	},
	children: {
		flex: 1,
		borderTopColor: colors.lightGray,
		borderTopWidth: 1,
		height: '100%'
	}
});

/**
 * Component that renders scrollable content inside signature request user interface
 */
class SignatureRequest extends Component {
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
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Content to display above the action buttons
		 */
		children: PropTypes.node,
		/**
		 * Custom message to be displayed to the user
		 */
		message: PropTypes.string
	};

	render() {
		const { children, message, accounts, selectedAddress, identities } = this.props;
		const balance = fromWei(accounts[selectedAddress].balance, 'ether');
		const accountLabel = identities[selectedAddress].name;
		return (
			<View style={styles.root}>
				<View style={styles.header}>
					<View style={styles.accountInformation}>
						<View>
							<Text>{strings('signature_request.account_title')}</Text>
							<View style={styles.account}>
								<View style={styles.identicon}>
									<Identicon address={selectedAddress} diameter={20} />
								</View>
								<View>
									<Text style={styles.text}>{accountLabel}</Text>
								</View>
							</View>
						</View>
						<View>
							<Text>{strings('signature_request.balance_title')}</Text>
							<Text style={styles.text}>
								{balance} {strings('unit.eth')}
							</Text>
						</View>
					</View>
					<View style={styles.signingInformation}>
						<Text style={styles.signatureText}>{strings('signature_request.sign_requested')}</Text>
						{message ? (
							<Text style={styles.warningText}>{message}</Text>
						) : (
							<Text style={styles.signText}>{strings('signature_request.signing')}</Text>
						)}
					</View>
				</View>
				<ActionView
					cancelTestID={'request-signature-cancel-button'}
					confirmTestID={'request-signature-confirm-button'}
					cancelText={strings('signature_request.cancel')}
					confirmText={strings('signature_request.sign')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.props.onConfirm}
				>
					<View style={styles.children}>
						<KeyboardAwareScrollView>{children}</KeyboardAwareScrollView>
					</View>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress,
	identities: state.backgroundState.PreferencesController.identities
});

export default connect(mapStateToProps)(SignatureRequest);
