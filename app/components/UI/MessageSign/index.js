import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: '90%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	informationRow: {
		borderBottomColor: colors.grey200,
		borderBottomWidth: 1,
		padding: 20
	},
	messageLabelText: {
		...fontStyles.normal,
		margin: 5,
		fontSize: 16
	}
});

/**
 * PureComponent that supports eth_sign
 */
export default class MessageSign extends PureComponent {
	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * Personal message to be displayed to the user
		 */
		messageParams: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await MessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signMessage(cleanMessageParams);
		MessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		MessageManager.rejectMessage(messageId);
	};

	cancelSignature = () => {
		this.rejectMessage();
		this.props.onCancel();
	};

	confirmSignature = () => {
		this.signMessage();
		this.props.onConfirm();
	};

	render() {
		const { messageParams, currentPageInformation, navigation } = this.props;
		return (
			<View style={styles.root}>
				<SignatureRequest
					navigation={navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					currentPageInformation={currentPageInformation}
					type="ethSign"
					showWarning
				>
					<View style={styles.informationRow}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						<Text>{messageParams.data}</Text>
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
