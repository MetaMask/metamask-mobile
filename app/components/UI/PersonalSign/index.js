import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { util } from '@metamask/controllers';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';

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
		marginBottom: 4
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
		currentPageInformation: PropTypes.object,
		/**
		 * Hides or shows the expanded signing message
		 */
		toggleExpandedMessage: PropTypes.func,
		/**
		 * Indicated whether or not the expanded message is shown
		 */
		showExpandedMessage: PropTypes.bool
	};

	state = {
		truncateMessage: false
	};

	showWalletConnectNotification = (messageParams = {}, confirmation = false) => {
		InteractionManager.runAfterInteractions(() => {
			messageParams.origin &&
				messageParams.origin.includes(WALLET_CONNECT_ORIGIN) &&
				NotificationManager.showSimpleNotification({
					status: `simple_notification${!confirmation ? '_rejected' : ''}`,
					duration: 5000,
					title: confirmation
						? strings('notifications.wc_signed_title')
						: strings('notifications.wc_signed_rejected_title'),
					description: strings('notifications.wc_description')
				});
		});
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await PersonalMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signPersonalMessage(cleanMessageParams);
		PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
		this.showWalletConnectNotification(messageParams, true);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { PersonalMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		PersonalMessageManager.rejectMessage(messageId);
		this.showWalletConnectNotification(messageParams);
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
		const { messageParams, showExpandedMessage } = this.props;
		const { truncateMessage } = this.state;
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
			messageText = truncateMessage ? (
				<Text numberOfLines={5} ellipsizeMode={'tail'}>
					{textChild}
				</Text>
			) : (
				<Text onTextLayout={this.shouldTruncateMessage}>{textChild}</Text>
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

	render() {
		const { currentPageInformation, toggleExpandedMessage, showExpandedMessage } = this.props;
		const rootView = showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderMessageText}
				toggleExpandedMessage={toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={this.props.navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				showExpandedMessage={showExpandedMessage}
				toggleExpandedMessage={toggleExpandedMessage}
				truncateMessage={this.state.truncateMessage}
				type="personalSign"
			>
				<View style={styles.messageWrapper}>{this.renderMessageText()}</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
