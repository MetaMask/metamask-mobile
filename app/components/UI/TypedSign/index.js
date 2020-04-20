import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import WebsiteIcon from '../WebsiteIcon';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';
import { getHost } from '../../../util/browser';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: '70%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	expandedRoot: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white,
		maxHeight: '75%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	expandedMessageHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20
	},
	arrowIcon: {
		...baseStyles.flexGrow,
		color: colors.grey200
	},
	iconHidden: {
		...baseStyles.flexGrow
	},
	messageLabelTextExpanded: {
		...baseStyles.flexGrow,
		textAlign: 'center',
		...fontStyles.bold,
		fontSize: 16
	},
	messageIntroWrapper: {
		alignItems: 'center',
		marginBottom: 20
	},
	domainLogo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginBottom: 20
	},
	messageFromLabel: {
		textAlign: 'center',
		...fontStyles.bold,
		fontSize: 16
	},
	scrollView: {
		flex: 1
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
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */
export default class TypedSign extends React.Component {
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
		showExpandedMessage: false
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

	renderRoot = () => {
		const { messageParams, currentPageInformation } = this.props;
		const url = currentPageInformation.url;
		const title = getHost(url);
		let domain;
		if (messageParams.version === 'V3') {
			domain = JSON.parse(messageParams.data).domain;
		}
		const rootView = this.state.showExpandedMessage ? (
			<View style={styles.expandedRoot}>
				<TouchableOpacity style={styles.expandedMessageHeader} onPress={this.toggleExpandedMessage}>
					<Ionicons name={'ios-arrow-back'} size={30} style={styles.arrowIcon} />
					<Text style={styles.messageLabelTextExpanded}>{strings('signature_request.message')}</Text>
					<View style={styles.iconHidden} />
				</TouchableOpacity>
				<View style={styles.messageIntroWrapper}>
					<WebsiteIcon style={styles.domainLogo} title={title} url={url} />
					<Text style={styles.messageFromLabel}>
						{strings('signature_request.message_from')} {title}
					</Text>
				</View>
				<ScrollView style={styles.scrollView}>{this.renderTypedMessage()}</ScrollView>
			</View>
		) : (
			<View style={styles.root}>
				<SignatureRequest
					navigation={this.props.navigation}
					onCancel={this.cancelSignature}
					onConfirm={this.confirmSignature}
					toggleExpandedMessage={this.toggleExpandedMessage}
					domain={domain}
					currentPageInformation={currentPageInformation}
					shouldRenderArrow
					type="typedSign"
				>
					<View style={styles.informationCol}>
						<Text style={styles.messageLabelText}>{strings('signature_request.message')}:</Text>
						<View style={styles.messageWrapper}>{this.renderTypedMessage()}</View>
					</View>
				</SignatureRequest>
			</View>
		);
		return rootView;
	};

	render() {
		return this.renderRoot();
	}
}
