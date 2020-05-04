import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { util } from 'gaba';

const styles = StyleSheet.create({
	messageText: {
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal,
		textAlign: 'center'
	},
	textLeft: {
		textAlign: 'left'
	},
	messageWrapper: {
		marginBottom: 5
	}
});

/**
 * Component that supports personal_sign
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

	state = {
		renderArrow: false,
		showExpandedMessage: false
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

	renderMessageText = () => {
		const { messageParams } = this.props;
		const { renderArrow, showExpandedMessage } = this.state;
		const textChild = util
			.hexToText(messageParams.data)
			.split('\n')
			.map((line, i) => (
				<Text key={`txt_${i}`} style={[styles.messageText, !showExpandedMessage ? styles.textLeft : null]}>
					{line}
				</Text>
			));
		let messageText;
		if (showExpandedMessage) {
			messageText = textChild;
		} else {
			messageText = renderArrow ? (
				<Text numberOfLines={5} ellipsizeMode={'tail'}>
					{textChild}
				</Text>
			) : (
				<Text onTextLayout={this.shouldRenderArrow}>{textChild}</Text>
			);
		}
		return messageText;
	};

	shouldRenderArrow = e => {
		if (e.nativeEvent.lines.length > 5) {
			this.setState({ renderArrow: true });
			return;
		}
		this.setState({ renderArrow: false });
	};

	toggleExpandedMessage = () => {
		this.setState({ showExpandedMessage: !this.state.showExpandedMessage });
	};

	render() {
		const { currentPageInformation } = this.props;
		const { showExpandedMessage } = this.state;
		const rootView = showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderMessageText}
				toggleExpandedMessage={this.toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={this.props.navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				showExpandedMessage={showExpandedMessage}
				toggleExpandedMessage={this.toggleExpandedMessage}
				shouldRenderArrow={this.state.renderArrow}
				type="personalSign"
			>
				<View style={styles.messageWrapper}>{this.renderMessageText()}</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
