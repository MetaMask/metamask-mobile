import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ActionView from '../ActionView';
import TransactionHeader from '../TransactionHeader';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { getHost } from '../../../util/browser';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: '90%',
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	wrapper: {
		paddingHorizontal: 25
	},
	title: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14,
		marginVertical: 24,
		textAlign: 'center'
	},
	intro: {
		...fontStyles.normal,
		textAlign: 'center',
		color: colors.fontPrimary,
		fontSize: Device.isSmallDevice() ? 16 : 20,
		marginVertical: 24
	},
	dappTitle: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: Device.isSmallDevice() ? 16 : 20
	},
	permissions: {
		alignItems: 'center',
		borderBottomWidth: 1,
		borderColor: colors.grey100,
		borderTopWidth: 1,
		display: 'flex',
		flexDirection: 'row',
		paddingHorizontal: 8,
		paddingVertical: 16
	},
	permissionText: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		flexGrow: 1,
		flexShrink: 1,
		fontSize: 14
	},
	permission: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14
	},
	warning: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 14,
		marginVertical: 24
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
		const {
			currentPageInformation: { url },
			currentPageInformation
		} = this.props;
		const title =
			typeof currentPageInformation.title === 'string' && currentPageInformation.title !== ''
				? currentPageInformation.title
				: getHost(url);
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						<Text>{strings('accountApproval.title')}</Text>
					</Text>
				</View>
				<ActionView
					cancelText={strings('accountApproval.cancel')}
					confirmText={strings('accountApproval.connect')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper}>
						<TransactionHeader currentPageInformation={currentPageInformation} />
						<Text style={styles.intro}>
							<Text style={styles.dappTitle}>{title} </Text>
							{strings('accountApproval.action')}:
						</Text>
						<View style={styles.permissions}>
							<Text style={styles.permissionText} numberOfLines={1}>
								{strings('accountApproval.permission')}
								<Text style={styles.permission}> {strings('accountApproval.address')}</Text>
							</Text>
							<Icon name="info-circle" color={colors.blue} size={22} />
						</View>
						<Text style={styles.warning}>{strings('accountApproval.warning')}</Text>
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
