import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../locales/i18n';

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
	},
	message: {
		marginLeft: 20
	}
});

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */
export default class TypedSign extends Component {
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
		 * Typed message to be displayed to the user
		 */
		messageParams: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const version = messageParams.version;
		const cleanMessageParams = await TypedMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signTypedMessage(cleanMessageParams, version);
		TypedMessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		TypedMessageManager.rejectMessage(messageId);
	};

	cancelSignature = () => {
		this.rejectMessage();
		this.props.onCancel();
	};

	confirmSignature = () => {
		this.signMessage();
		this.props.onConfirm();
	};

	renderTypedMessageV3 = obj =>
		Object.keys(obj).map(key => (
			<View style={styles.message} key={key}>
				{typeof obj[key] === 'object' ? (
					<View>
						<Text>{key}:</Text>
						<View>{this.renderTypedMessageV3(obj[key])}</View>
					</View>
				) : (
					<Text>
						{key}: {obj[key]}
					</Text>
				)}
			</View>
		));

	renderTypedMessage = () => {
		const { messageParams } = this.props;
		if (messageParams.version === 'V1') {
			return (
				<View style={styles.message}>
					{messageParams.data.map(obj => (
						<View key={obj.name}>
							<Text style={styles.messageText}>{obj.name}:</Text>
							<Text style={styles.messageText} key={obj.name}>
								{' '}
								{obj.value}
							</Text>
						</View>
					))}
				</View>
			);
		}
		if (messageParams.version === 'V3') {
			const { message } = JSON.parse(messageParams.data);
			return this.renderTypedMessageV3(message);
		}
	};

	render() {
		const { messageParams, currentPageInformation } = this.props;
		let domain;
		if (messageParams.version === 'V3') {
			domain = JSON.parse(messageParams.data).domain;
		}
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
					domain={domain}
					currentPageInformation={currentPageInformation}
				>
					<View style={styles.informationRow}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						{this.renderTypedMessage()}
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
