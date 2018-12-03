import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../locales/i18n';
import { hexToText } from 'gaba/util';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: 600,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10
	},
	informationRow: {
		borderBottomColor: colors.lightGray,
		borderBottomWidth: 1,
		padding: 20
	},
	messageLabelText: {
		...fontStyles.normal,
		margin: 5,
		fontSize: 16
	},
	messageText: {
		...fontStyles.normal,
		margin: 5,
		color: colors.black
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	}
});

/**
 * Component that supports eth_sign and personal_sign
 */
export default class PersonalSign extends Component {
	static navigationOptions = () => ({
		title: strings('signature_request.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});
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
		messageParams: PropTypes.object
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
		const { messageParams } = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						{strings('signature_request.title')}
					</Text>
				</View>
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
				>
					<View style={styles.informationRow}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						<Text style={styles.messageText}>{hexToText(messageParams.data)}</Text>
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
