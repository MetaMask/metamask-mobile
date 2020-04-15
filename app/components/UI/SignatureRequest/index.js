import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WebsiteIcon from '../WebsiteIcon';
import ActionView from '../ActionView';
import AccountInfoCard from '../AccountInfoCard';
import TransactionHeader from '../TransactionHeader';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	signingInformation: {
		margin: 10
	},
	websiteIconWrapper: {
		...baseStyles.flexGrow,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 5,
		marginRight: 15
	},
	domainLogo: {
		width: 40,
		height: 40,
		borderRadius: 32
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
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
		padding: 5,
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
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		width: '90%',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		height: 200,
		marginBottom: 20,
		paddingVertical: 10,
		paddingHorizontal: 15
	},
	arrowIconWrapper: {
		...baseStyles.flexGrow,
		alignSelf: 'center',
		alignItems: 'flex-end'
	}
});

/**
 * PureComponent that renders scrollable content inside signature request user interface
 */
class SignatureRequest extends PureComponent {
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

	render() {
		const { children, showWarning, currentPageInformation, type } = this.props;
		const url = currentPageInformation.url;
		const title = getHost(url);
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
					<View style={styles.childrenWrapper}>
						<View style={styles.children}>
							<View style={styles.websiteIconWrapper}>
								<WebsiteIcon
									style={styles.domainLogo}
									viewStyle={styles.assetLogo}
									title={title}
									url={url}
								/>
							</View>
							{children}
							<View style={styles.arrowIconWrapper}>
								<Ionicons name={'ios-arrow-forward'} size={20} />
							</View>
						</View>
						<AccountInfoCard />
					</View>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(SignatureRequest);
