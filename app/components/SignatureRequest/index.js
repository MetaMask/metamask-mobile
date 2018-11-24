import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { fromWei } from '../../util/number';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	text: {
		...fontStyles.normal
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
		const { children, message, accounts, selectedAddress } = this.props;
		const balance = fromWei(accounts[selectedAddress].balance, 'ether');
		return (
			<View style={styles.root}>
				<ActionView
					cancelTestID={'request-signature-cancel-button'}
					confirmTestID={'request-signature-confirm-button'}
					cancelText={strings('signature_request.cancel')}
					confirmText={strings('signature_request.sign')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.props.onConfirm}
				>
					<View>
						<Text style={styles.text}>{strings('signature_request.sign_requested')}</Text>
					</View>
					<View>
						<Text style={styles.text}>
							{selectedAddress} {balance}
						</Text>
						<Text style={styles.text}>{message || strings('signature_request.signing')}</Text>
					</View>
					<KeyboardAwareScrollView>{children}</KeyboardAwareScrollView>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(SignatureRequest);
