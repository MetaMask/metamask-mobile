import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import NotificationManager from '../../../core/NotificationManager';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	accountCardWrapper: {
		paddingHorizontal: 24
	},
	intro: {
		...fontStyles.bold,
		textAlign: 'center',
		color: colors.fontPrimary,
		fontSize: Device.isSmallDevice() ? 16 : 20,
		marginBottom: 8,
		marginTop: 16
	},
	warning: {
		...fontStyles.thin,
		color: colors.fontPrimary,
		paddingHorizontal: 24,
		marginBottom: 16,
		fontSize: 14,
		width: '100%',
		textAlign: 'center'
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		paddingVertical: 16,
		paddingHorizontal: 24
	},
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	}
});

/**
 * Account access approval component
 */
class AccountApproval extends PureComponent {
	static propTypes = {
		/**
		 * Object containing current page title, url, and icon href
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * Callback triggered on account access approval
		 */
		onConfirm: PropTypes.func,
		/**
		 * Callback triggered on account access rejection
		 */
		onCancel: PropTypes.func,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Whether it was a request coming through wallet connect
		 */
		walletConnectRequest: PropTypes.bool
	};

	state = {
		start: Date.now()
	};

	componentDidMount = () => {
		const params = this.getTrackingParams();
		delete params.timeOpen;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.AUTHENTICATION_CONNECT, params);
		});
	};

	showWalletConnectNotification = () => {
		if (this.props.walletConnectRequest) {
			const title = this.props.currentPageInformation.title;
			InteractionManager.runAfterInteractions(() => {
				NotificationManager.showSimpleNotification({
					duration: 5000,
					title: strings('notifications.wallet_connect_title', { title }),
					description: strings('notifications.wallet_connect_description')
				});
			});
		}
	};

	/**
	 * Calls onConfirm callback and analytics to track connect confirmed event
	 */
	onConfirm = () => {
		this.props.onConfirm();
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.AUTHENTICATION_CONNECT_CONFIRMED,
			this.getTrackingParams()
		);
		this.showWalletConnectNotification();
	};

	/**
	 * Calls onConfirm callback and analytics to track connect canceled event
	 */
	onCancel = () => {
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.AUTHENTICATION_CONNECT_CANCELED,
			this.getTrackingParams()
		);
		this.props.onCancel();
		this.showWalletConnectNotification();
	};

	/**
	 * Returns corresponding tracking params to send
	 *
	 * @return {object} - Object containing numberOfTokens, numberOfAccounts, network and timeOpen
	 */
	getTrackingParams = () => {
		const {
			tokensLength,
			accountsLength,
			networkType,
			currentPageInformation: { url }
		} = this.props;
		return {
			view: url,
			numberOfTokens: tokensLength,
			numberOfAccounts: accountsLength,
			network: networkType,
			timeOpen: (Date.now() - this.state.start) / 1000
		};
	};

	render = () => {
		const { currentPageInformation } = this.props;
		return (
			<View style={styles.root}>
				<TransactionHeader currentPageInformation={currentPageInformation} />
				<Text style={styles.intro}>{strings('accountApproval.action')}</Text>
				<Text style={styles.warning}>{strings('accountApproval.warning')}</Text>
				<View style={styles.accountCardWrapper}>
					<AccountInfoCard />
				</View>
				<View style={styles.actionContainer}>
					<StyledButton
						type={'cancel'}
						onPress={this.onCancel}
						containerStyle={[styles.button, styles.cancel]}
						testID={'connect-cancel-button'}
					>
						{strings('accountApproval.cancel')}
					</StyledButton>
					<StyledButton
						type={'confirm'}
						onPress={this.onConfirm}
						containerStyle={[styles.button, styles.confirm]}
						testID={'connect-approve-button'}
					>
						{strings('accountApproval.connect')}
					</StyledButton>
				</View>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(AccountApproval);
