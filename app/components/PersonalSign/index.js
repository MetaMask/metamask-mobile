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
		flex: 1
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
		navigation: PropTypes.object
	};

	signMessage = async () => {
		const {
			params: { messageParams }
		} = this.props.navigation.state;
		const { KeyringController, PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await PersonalMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signPersonalMessage(cleanMessageParams);
		PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = () => {
		const {
			params: { messageParams }
		} = this.props.navigation.state;
		const { PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		PersonalMessageManager.rejectMessage(messageId);
	};

	cancelSignature = () => {
		this.rejectMessage();
		this.props.navigation.pop();
	};

	confirmSignature = () => {
		this.signMessage();
		this.props.navigation.pop();
	};

	render() {
		const {
			params: { messageParams }
		} = this.props.navigation.state;
		return (
			<View style={styles.root}>
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
