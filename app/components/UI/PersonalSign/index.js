import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../../locales/i18n';
import { util } from 'gaba';
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
	},
	messageText: {
		flex: 1,
		margin: 5,
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	}
});

/**
 * PureComponent that supports personal_sign
 */
export default class PersonalSign extends PureComponent {
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
		const { KeyringController, PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await PersonalMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signPersonalMessage(cleanMessageParams);
		PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		PersonalMessageManager.rejectMessage(messageId);
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
		const { messageParams, currentPageInformation } = this.props;
		return (
			<View style={styles.root}>
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					currentPageInformation={currentPageInformation}
					type="personalSign"
				>
					<View style={styles.informationRow}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						{util
							.hexToText(messageParams.data)
							.split('\n')
							.map((line, i) => (
								<Text key={`txt_${i}`} style={styles.messageText}>
									{line}
								</Text>
							))}
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
