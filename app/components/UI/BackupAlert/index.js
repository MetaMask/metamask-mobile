import React, { PureComponent } from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import { connect } from 'react-redux';

const BROWSER_ROUTE = 'BrowserView';

const styles = StyleSheet.create({
	backupAlertWrapper: {
		flex: 1,
		backgroundColor: colors.orange000,
		borderColor: colors.yellow200,
		borderWidth: 1,
		position: 'absolute',
		left: 16,
		right: 16,
		borderRadius: 8,
		padding: 8
	},
	backupAlertIconWrapper: {
		marginRight: 13
	},
	backupAlertIcon: {
		fontSize: 22,
		color: colors.yellow700
	},
	backupAlertTitle: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.yellow700,
		...fontStyles.bold
	},
	backupAlertMessage: {
		fontSize: 10,
		lineHeight: 14,
		color: colors.yellow700,
		...fontStyles.normal
	},
	touchableView: {
		flexDirection: 'row'
	},
	modalViewInBrowserView: {
		bottom: Device.isIphoneX() ? 90 : 80
	},
	modalViewNotInBrowserView: {
		bottom: Device.isIphoneX() ? 20 : 10
	}
});

const BLOCKED_LIST = [
	'PaymentChannelDeposit',
	'PaymentChannelSend',
	'ImportPrivateKey',
	'Send',
	'SendTo',
	'Amount',
	'Confirm',
	'Approval',
	'Approve',
	'AddBookmark',
	'RevealPrivateCredentialView',
	'AccountBackupStep',
	'ManualBackupStep'
];

/**
 * PureComponent that renders an alert shown when the
 * seed phrase hasn't been backed up
 */
class BackupAlert extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		/**
		 * The action that will be triggered onPress
		 */
		onPress: PropTypes.any,
		/**
		 * redux flag that indicates if the user
		 * completed the seed phrase backup flow
		 */
		seedphraseBackedUp: PropTypes.bool,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool
	};

	state = {
		inBrowserView: false,
		inAccountBackupStep: false
	};

	componentDidUpdate = async prevProps => {
		if (prevProps.navigation.state !== this.props.navigation.state) {
			const currentRouteName = this.findRouteNameFromNavigatorState(this.props.navigation.state);
			const inBrowserView = currentRouteName === BROWSER_ROUTE;
			const blockedView = BLOCKED_LIST.find(path => currentRouteName.includes(path));
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ inBrowserView, blockedView });
		}
	};

	findRouteNameFromNavigatorState({ routes }) {
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route.routeName;
	}

	render() {
		const { onPress, seedphraseBackedUp, passwordSet } = this.props;
		const { inBrowserView, blockedView } = this.state;
		if (!passwordSet || seedphraseBackedUp || blockedView) return null;
		return (
			<ElevatedView
				elevation={99}
				style={[
					styles.backupAlertWrapper,
					inBrowserView ? styles.modalViewInBrowserView : styles.modalViewNotInBrowserView
				]}
			>
				<TouchableOpacity onPress={onPress} style={styles.touchableView}>
					<View style={styles.backupAlertIconWrapper}>
						<Icon name="info-outline" style={styles.backupAlertIcon} />
					</View>
					<View>
						<Text style={styles.backupAlertTitle}>{strings('browser.backup_alert_title')}</Text>
						<Text style={styles.backupAlertMessage}>{strings('browser.backup_alert_message')}</Text>
					</View>
				</TouchableOpacity>
			</ElevatedView>
		);
	}
}

const mapStateToProps = state => ({
	seedphraseBackedUp: state.user.seedphraseBackedUp,
	passwordSet: state.user.passwordSet
});

export default connect(mapStateToProps)(BackupAlert);
