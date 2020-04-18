import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WebsiteIcon from '../WebsiteIcon';
import ActionView from '../ActionView';
import AccountInfoCard from '../AccountInfoCard';
import TransactionHeader from '../TransactionHeader';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	signingInformation: {
		margin: 10
	},
	domainLogo: {
		width: 40,
		height: 40,
		marginRight: 15,
		borderRadius: 20
	},
	warningText: {
		...fontStyles.normal,
		color: colors.red,
		textAlign: 'center',
		paddingTop: 10,
		paddingHorizontal: 10
	},
	warningLink: {
		...fontStyles.normal,
		color: colors.blue,
		textAlign: 'center',
		paddingHorizontal: 10,
		paddingBottom: 10,
		textDecorationLine: 'underline'
	},
	signText: {
		...fontStyles.bold,
		fontSize: 20,
		marginBottom: 10,
		textAlign: 'center'
	},
	childrenWrapper: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: '100%'
	},
	children: {
		flex: 2,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		width: '90%',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		height: 200,
		marginBottom: 20,
		padding: 16
	},
	arrowIconWrapper: {
		alignSelf: 'center',
		marginLeft: 'auto'
	},
	arrowIcon: {
		textAlign: 'right',
		color: colors.grey200,
		alignSelf: 'flex-end'
	}
});

/**
 * PureComponent that renders scrollable content inside signature request user interface
 */
class SignatureRequest extends React.Component {
	static propTypes = {
		/**
		 * Object representing the navigator
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
		 * Content to display above the action buttons
		 */
		children: PropTypes.node,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * String representing signature type
		 */
		type: PropTypes.string,
		/**
		 * String representing the selected network
		 */
		networkType: PropTypes.string,
		/**
		 * Whether it should display the warning message
		 */
		showWarning: PropTypes.bool
	};

	state = {
		showExpandedMessage: false
	};

	/**
	 * Calls trackCancelSignature and onCancel callback
	 */
	onCancel = () => {
		this.props.onCancel();
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.TRANSACTIONS_CANCEL_SIGNATURE,
			this.getTrackingParams()
		);
	};

	/**
	 * Calls trackConfirmSignature and onConfirm callback
	 */
	onConfirm = () => {
		this.props.onConfirm();
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_SIGNATURE,
			this.getTrackingParams()
		);
	};

	/**
	 * Returns corresponding tracking params to send
	 *
	 * @return {object} - Object containing network and functionType
	 */
	getTrackingParams = () => {
		const { type, networkType } = this.props;
		return {
			network: networkType,
			functionType: type
		};
	};

	goToWarning = () => {
		this.props.onCancel();
		this.props.navigation.push('Webview', {
			url: 'https://metamask.zendesk.com/hc/en-us/articles/360015488751',
			title: 'metamask.zendesk.com'
		});
	};

	showWarning = () => (
		<TouchableOpacity onPress={this.goToWarning}>
			<Text style={styles.warningText}>
				{strings('signature_request.eth_sign_warning')}
				{` `}
				<Text style={styles.warningLink}>{strings('signature_request.learn_more')}</Text>
			</Text>
		</TouchableOpacity>
	);

	renderActionViewChildren = () => {
		const { children, currentPageInformation } = this.props;
		const { showExpandedMessage } = this.state;
		const url = currentPageInformation.url;
		const title = getHost(url);
		const arrowIcon = this.shouldRenderArrow() ? this.renderArrowIcon() : null;
		const actionViewChildren = showExpandedMessage ? (
			<View />
		) : (
			<View style={styles.childrenWrapper}>
				<TouchableWithoutFeedback>
					<View style={styles.children}>
						<WebsiteIcon style={styles.domainLogo} title={title} url={url} />
						{children}
						{arrowIcon}
					</View>
				</TouchableWithoutFeedback>
				<AccountInfoCard />
			</View>
		);
		return actionViewChildren;
	};

	shouldRenderArrow = () => {
		if (this.props.children._owner.type.name === 'TypedSign') {
			return true;
		}
		return false;
	};

	renderArrowIcon = () => (
		<View style={styles.arrowIconWrapper}>
			<Ionicons name={'ios-arrow-forward'} size={20} style={styles.arrowIcon} />
		</View>
	);

	handleMessageTap = () => {
		this.setState({ showExpandedMessage: !this.state.showExpandedMessage });
	};

	render() {
		const { showWarning, currentPageInformation, type } = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.header}>
					<TransactionHeader currentPageInformation={currentPageInformation} type={type} />
					<View style={styles.signingInformation}>
						{showWarning ? (
							this.showWarning()
						) : (
							<Text style={styles.signText}>{strings('signature_request.signing')}</Text>
						)}
					</View>
				</View>
				<ActionView
					cancelTestID={'request-signature-cancel-button'}
					confirmTestID={'request-signature-confirm-button'}
					cancelText={strings('signature_request.cancel')}
					confirmText={strings('signature_request.sign')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					isSigning
				>
					{this.renderActionViewChildren()}
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(SignatureRequest);
