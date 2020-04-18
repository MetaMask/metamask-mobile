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
		minHeight: '70%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	informationCol: {
		width: '75%',
		alignItems: 'flex-start',
		flexDirection: 'column'
	},
	messageText: {
		color: colors.black,
		...fontStyles.normal,
		fontFamily: Device.isIos() ? 'Courier' : 'Roboto'
	},
	messageLabelText: {
		flex: 1,
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 5
	},
	message: {
		marginLeft: 10
	},
	messageWrapper: {
		flex: 4,
		flexDirection: 'column',
		overflow: 'hidden',
		zIndex: 1
	},
	msgKey: {
		fontWeight: 'bold'
	}
});

/**
 * PureComponent that supports eth_signTypedData and eth_signTypedData_v3
 */
export default class TypedSign extends PureComponent {
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
				{obj[key] && typeof obj[key] === 'object' ? (
					<View>
						<Text style={[styles.messageText, styles.msgKey]}>{key}:</Text>
						<View>{this.renderTypedMessageV3(obj[key])}</View>
					</View>
				) : (
					<Text style={styles.messageText}>
						<Text style={styles.msgKey}>{key}:</Text> {obj[key]}
					</Text>
				)}
			</View>
		));

	renderTypedMessage = () => {
		const { messageParams } = this.props;
		if (messageParams.version === 'V1') {
			return (
				<View style={styles.message}>
					{messageParams.data.map((obj, i) => (
						<View key={`${obj.name}_${i}`}>
							<Text style={[styles.messageText, styles.msgKey]}>{obj.name}:</Text>
							<Text style={styles.messageText} key={obj.name}>
								{' '}
								{obj.value}
							</Text>
						</View>
					))}
				</View>
			);
		}
		if (messageParams.version === 'V3' || messageParams.version === 'V4') {
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
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					domain={domain}
					currentPageInformation={currentPageInformation}
					shouldRenderArrow
					type="typedSign"
				>
					<View style={styles.informationCol}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						<View style={styles.messageWrapper}>{this.renderTypedMessage()}</View>
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
