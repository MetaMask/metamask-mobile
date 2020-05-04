import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';

const styles = StyleSheet.create({
	expandedMessage: {
		textAlign: 'center',
		...fontStyles.regular,
		fontSize: 14
	},
	messageWrapper: {
		marginBottom: 5
	}
});

/**
 * Component that supports eth_sign
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

	state = {
		truncateMessage: false,
		showExpandedMessage: false
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

	renderMessageText = () => {
		const { messageParams } = this.props;
		const { truncateMessage, showExpandedMessage } = this.state;

		let messageText;
		if (showExpandedMessage) {
			messageText = <Text style={styles.expandedMessage}>{messageParams.data}</Text>;
		} else {
			messageText = truncateMessage ? (
				<Text numberOfLines={5} ellipsizeMode={'tail'}>
					{messageParams.data}
				</Text>
			) : (
				<Text onTextLayout={this.shouldTruncateMessage}>{messageParams.data}</Text>
			);
		}
		return messageText;
	};

	shouldTruncateMessage = e => {
		if (e.nativeEvent.lines.length > 5) {
			this.setState({ truncateMessage: true });
			return;
		}
		this.setState({ truncateMessage: false });
	};

	toggleExpandedMessage = () => {
		this.setState({ showExpandedMessage: !this.state.showExpandedMessage });
	};

	render() {
		const { currentPageInformation, navigation } = this.props;
		const { showExpandedMessage } = this.state;
		const rootView = showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderMessageText}
				toggleExpandedMessage={this.toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				truncateMessage={this.state.truncateMessage}
				showExpandedMessage={showExpandedMessage}
				toggleExpandedMessage={this.toggleExpandedMessage}
				type="ethSign"
				showWarning
			>
				<View style={styles.messageWrapper}>{this.renderMessageText()}</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
