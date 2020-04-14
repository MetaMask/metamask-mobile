import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import TransactionHeader from '../TransactionHeader';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
		...fontStyles.normal,
		fontSize: 16,
		padding: 5,
		textAlign: 'center'
	},
	children: {
		flex: 1,
		borderTopColor: colors.grey200,
		borderTopWidth: 1,
		height: '100%'
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
				>
					<View style={styles.children}>
						<KeyboardAwareScrollView>{children}</KeyboardAwareScrollView>
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
