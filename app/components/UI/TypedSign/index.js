import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import Device from '../../../util/device';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import AnalyticsV2 from '../../../util/analyticsV2';
import URL from 'url-parse';

const styles = StyleSheet.create({
	messageText: {
		color: colors.black,
		...fontStyles.normal,
		fontFamily: Device.isIos() ? 'Courier' : 'Roboto',
	},
	message: {
		marginLeft: 10,
	},
	truncatedMessageWrapper: {
		marginBottom: 4,
		overflow: 'hidden',
	},
	iosHeight: {
		height: 70,
	},
	androidHeight: {
		height: 97,
	},
	msgKey: {
		fontWeight: 'bold',
	},
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
			const { currentPageInformation, messageParams } = this.props;
			const { NetworkController } = Engine.context;
			const { chainId, type } = NetworkController?.state?.provider || {};
			const url = new URL(currentPageInformation?.url);
			return {
				dapp_host_name: url?.host,
				dapp_url: currentPageInformation?.url,
				network_name: type,
				chain_id: chainId,
				sign_type: 'typed',
				version: messageParams?.version,
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
		const { KeyringController, TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const version = messageParams.version;
		const cleanMessageParams = await TypedMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signTypedMessage(cleanMessageParams, version);
		TypedMessageManager.setMessageStatusSigned(messageId, rawSig);
		this.showWalletConnectNotification(messageParams, true);
	};

	rejectMessage = () => {
		const { messageParams } = this.props;
		const { TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		TypedMessageManager.rejectMessage(messageId);
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

	shouldTruncateMessage = (e) => {
		if (
			(Device.isIos() && e.nativeEvent.layout.height > 70) ||
			(Device.isAndroid() && e.nativeEvent.layout.height > 100)
		) {
			this.setState({ truncateMessage: true });
			return;
		}
		this.setState({ truncateMessage: false });
	};

	renderTypedMessageV3 = (obj) =>
		Object.keys(obj).map((key) => (
			<View style={styles.message} key={key}>
				{obj[key] && typeof obj[key] === 'object' ? (
					<View>
						<Text style={[styles.messageText, styles.msgKey]}>{key}:</Text>
						<View>{this.renderTypedMessageV3(obj[key])}</View>
					</View>
				) : (
					<Text style={styles.messageText}>
						<Text style={styles.msgKey}>{key}:</Text> {`${obj[key]}`}
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
								{` ${obj.value}`}
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
		const { messageParams, currentPageInformation, showExpandedMessage, toggleExpandedMessage } = this.props;
		const { truncateMessage } = this.state;
		const messageWrapperStyles = [];
		let domain;
		if (messageParams.version === 'V3') {
			domain = JSON.parse(messageParams.data).domain;
		}
		if (truncateMessage) {
			messageWrapperStyles.push(styles.truncatedMessageWrapper);
			if (Device.isIos()) {
				messageWrapperStyles.push(styles.iosHeight);
			} else {
				messageWrapperStyles.push(styles.androidHeight);
			}
		}

		const rootView = showExpandedMessage ? (
			<ExpandedMessage
				currentPageInformation={currentPageInformation}
				renderMessage={this.renderTypedMessage}
				toggleExpandedMessage={toggleExpandedMessage}
			/>
		) : (
			<SignatureRequest
				navigation={this.props.navigation}
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				toggleExpandedMessage={toggleExpandedMessage}
				domain={domain}
				currentPageInformation={currentPageInformation}
				truncateMessage={truncateMessage}
				type="typedSign"
			>
				<View style={messageWrapperStyles} onLayout={truncateMessage ? null : this.shouldTruncateMessage}>
					{this.renderTypedMessage()}
				</View>
			</SignatureRequest>
		);
		return rootView;
	}
}
