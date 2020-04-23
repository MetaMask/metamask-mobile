import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import ActionView from '../ActionView';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { getHost } from '../../../util/browser';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: '55%',
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	wrapper: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
		minHeight: '100%'
	},
	intro: {
		...fontStyles.bold,
		textAlign: 'center',
		color: colors.fontPrimary,
		fontSize: Device.isSmallDevice() ? 16 : 20,
		marginBottom: 15
	},
	warning: {
		...fontStyles.thin,
		color: colors.fontPrimary,
		fontSize: 14,
		width: '90%',
		marginBottom: 15,
		textAlign: 'center'
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
		networkType: PropTypes.string
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

	/**
	 * Calls onConfirm callback and analytics to track connect confirmed event
	 */
	onConfirm = () => {
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.AUTHENTICATION_CONNECT_CONFIRMED,
			this.getTrackingParams()
		);
		this.props.onConfirm();
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
				<ActionView
					cancelText={strings('accountApproval.cancel')}
					confirmText={strings('accountApproval.connect')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper}>
						<Text style={styles.intro}>{strings('accountApproval.action')}</Text>
						<Text style={styles.warning}>{strings('accountApproval.warning')}</Text>
						<AccountInfoCard />
					</View>
				</ActionView>
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
