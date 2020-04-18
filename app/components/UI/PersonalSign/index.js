import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import { strings } from '../../../../locales/i18n';
import { util } from 'gaba';
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
	messageLabelText: {
		...fontStyles.bold,
		marginBottom: 5,
		fontSize: 16
	},
	messageText: {
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	}
});

/**
 * PureComponent that supports personal_sign
 */
export default class PersonalSign extends React.Component {
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
		renderArrow: false
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
		const textChild = util
			.hexToText(messageParams.data)
			.split('\n')
			.map((line, i) => (
				<Text key={`txt_${i}`} style={styles.messageText}>
					{line}
				</Text>
			));
		const messageText = this.state.renderArrow ? (
			<Text numberOfLines={5} ellipsizeMode={'tail'}>
				{textChild}
			</Text>
		) : (
			<Text onTextLayout={this.shouldRenderArrow}>{textChild}</Text>
		);
		return messageText;
	};

	shouldRenderArrow = e => {
		if (e.nativeEvent.lines.length > 5) {
			this.setState({ renderArrow: true });
			return;
		}
		this.setState({ renderArrow: false });
	};

	render() {
		const { currentPageInformation } = this.props;
		return (
			<View style={styles.root}>
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					currentPageInformation={currentPageInformation}
					shouldRenderArrow={this.state.renderArrow}
					type="personalSign"
				>
					<View style={styles.informationCol}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}</Text>
						{this.renderMessageText()}
					</View>
				</SignatureRequest>
			</View>
		);
	}
}
