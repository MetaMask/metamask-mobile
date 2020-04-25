import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { renderFromWei } from '../../../util/number';
import Identicon from '../Identicon';
import WebsiteIcon from '../WebsiteIcon';
import { renderAccountName } from '../../../util/address';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { getHost } from '../../../util/browser';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	text: {
		...fontStyles.normal,
		fontSize: 16,
		padding: 5
	},
	accountInformation: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		margin: 20,
		marginBottom: 40
	},
	accountInfoCol: {
		flex: 1,
		height: 40
	},
	signingInformation: {
		margin: 10
	},
	account: {
		flex: 1,
		flexDirection: 'row'
	},
	identicon: {
		padding: 5
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
	domainText: {
		...fontStyles.normal,
		textAlign: 'center',
		fontSize: 12,
		padding: 5,
		color: colors.black
	},
	domainTitle: {
		...fontStyles.bold,
		textAlign: 'center',
		fontSize: 16,
		padding: 5,
		color: colors.black
	},
	children: {
		flex: 1,
		borderTopColor: colors.grey200,
		borderTopWidth: 1,
		height: '100%'
	},
	domainLogo: {
		marginTop: 15,
		width: 64,
		height: 64,
		borderRadius: 32
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
	},
	domainWrapper: {
		margin: 10
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
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Content to display above the action buttons
		 */
		children: PropTypes.node,
		/**
		 * Object containing domain information for the signature request for EIP712
		 */
		domain: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * String representing signature type
		 */
		type: PropTypes.string,
		/**
		 * String representing the selected the selected network
		 */
		networkType: PropTypes.string,
		/**
		 * Whether it should display the warning message
		 */
		showWarning: PropTypes.bool
	};

	renderPageInformation = () => {
		const {
			domain,
			currentPageInformation: { url },
			currentPageInformation
		} = this.props;
		const title = typeof currentPageInformation.title === 'string' ? currentPageInformation.title : getHost(url);
		const name = domain && typeof domain.name === 'string';
		return (
			<View style={styles.domainWrapper}>
				<WebsiteIcon style={styles.domainLogo} viewStyle={styles.assetLogo} title={title} url={url} />
				<Text style={styles.domainTitle}>{title}</Text>
				<Text style={styles.domainText}>{url}</Text>
				{!!name && <Text style={styles.domainText}>{name}</Text>}
			</View>
		);
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
		const { children, showWarning, accounts, selectedAddress, identities } = this.props;
		const balance = renderFromWei(accounts[selectedAddress].balance);
		const accountLabel = renderAccountName(selectedAddress, identities);
		return (
			<View style={styles.wrapper}>
				<View style={styles.header}>
					<View style={styles.accountInformation}>
						<View style={styles.accountInfoCol}>
							<Text>{strings('signature_request.account_title')}</Text>
							<View style={[styles.account, baseStyles.flexGrow]}>
								<View style={[styles.identicon]}>
									<Identicon address={selectedAddress} diameter={20} />
								</View>
								<View style={baseStyles.flexGrow}>
									<Text numberOfLines={1} style={styles.text}>
										{accountLabel}
									</Text>
								</View>
							</View>
						</View>
						<View style={styles.accountInfoCol}>
							<Text>{strings('signature_request.balance_title')}</Text>
							<Text style={styles.text}>
								{balance} {strings('unit.eth')}
							</Text>
						</View>
					</View>
					{this.renderPageInformation()}
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
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(SignatureRequest);
