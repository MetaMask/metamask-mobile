import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	messageText: {
		color: colors.black,
		...fontStyles.normal,
		fontFamily: Device.isIos() ? 'Courier' : 'Roboto'
	},
	message: {
		marginLeft: 10
	},
	truncatedMessageWrapper: {
		marginBottom: 5,
		height: 70,
		overflow: 'hidden'
	},
	msgKey: {
		fontWeight: 'bold'
	},
	messageWrapper: {
		marginBottom: 5,
		overflow: 'hidden'
	}
});

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
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

	state = {
		showExpandedMessage: false,
		truncateMessage: false
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

	toggleExpandedMessage = () => {
		this.setState({ showExpandedMessage: !this.state.showExpandedMessage });
	};

	shouldTruncateMessage = e => {
		if (e.nativeEvent.layout.height > 70) {
			this.setState({ truncateMessage: true });
			return;
		}
		this.setState({ truncateMessage: false });
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
		const { truncateMessage } = this.state;
		let domain;
		if (messageParams.version === 'V3') {
			domain = JSON.parse(messageParams.data).domain;
		}
		const rootView = this.state.showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderTypedMessage}
				toggleExpandedMessage={this.toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={this.props.navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				toggleExpandedMessage={this.toggleExpandedMessage}
				domain={domain}
				currentPageInformation={currentPageInformation}
				truncateMessage={truncateMessage}
				type="typedSign"
			>
				<View
					style={truncateMessage ? styles.truncatedMessageWrapper : styles.messageWrapper}
					onLayout={truncateMessage ? null : this.shouldTruncateMessage}
				>
					{this.renderTypedMessage()}
				</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
