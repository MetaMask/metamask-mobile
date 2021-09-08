import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import URL from 'url-parse';
import AnalyticsV2 from '../../../util/analyticsV2';

const styles = StyleSheet.create({
	expandedMessage: {
		textAlign: 'center',
		...fontStyles.regular,
		fontSize: 14,
	},
	messageWrapper: {
		marginBottom: 4,
	},
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
		currentPageInformation: PropTypes.object,
		/**
		 * Hides or shows the expanded signing message
		 */
		toggleExpandedMessage: PropTypes.func,
		/**
		 * Indicated whether or not the expanded message is shown
		 */
		showExpandedMessage: PropTypes.bool,
	};

	state = {
		truncateMessage: false,
	};

	getAnalyticsParams = () => {
		try {
			const { currentPageInformation } = this.props;
			const { NetworkController } = Engine.context;
			const { chainId, type } = NetworkController?.state?.provider || {};
			const url = new URL(currentPageInformation?.url);
			return {
				dapp_host_name: url?.host,
				dapp_url: currentPageInformation?.url,
				network_name: type,
				chain_id: chainId,
				sign_type: 'eth',
			};
		} catch (error) {
			return {};
		}
	};

	componentDidMount = () => {
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_STARTED, this.getAnalyticsParams());
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
					description: strings('notifications.wc_description'),
				});
		});
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await MessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signMessage(cleanMessageParams);
		MessageManager.setMessageStatusSigned(messageId, rawSig);
		this.showWalletConnectNotification(messageParams, true);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		MessageManager.rejectMessage(messageId);
		this.showWalletConnectNotification(messageParams);
	};

	cancelSignature = () => {
		this.rejectMessage();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_CANCELLED, this.getAnalyticsParams());
		this.props.onCancel();
	};

	confirmSignature = () => {
		this.signMessage();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_COMPLETED, this.getAnalyticsParams());
		this.props.onConfirm();
	};

	renderMessageText = () => {
		const { messageParams, showExpandedMessage } = this.props;
		const { truncateMessage } = this.state;

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

	shouldTruncateMessage = (e) => {
		if (e.nativeEvent.lines.length > 5) {
			this.setState({ truncateMessage: true });
			return;
		}
		this.setState({ truncateMessage: false });
	};

	render() {
		const { currentPageInformation, navigation, showExpandedMessage, toggleExpandedMessage } = this.props;
		const rootView = showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderMessageText}
				toggleExpandedMessage={toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				truncateMessage={this.state.truncateMessage}
				showExpandedMessage={showExpandedMessage}
				toggleExpandedMessage={toggleExpandedMessage}
				type="ethSign"
				showWarning
			>
				<View style={styles.messageWrapper}>{this.renderMessageText()}</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
