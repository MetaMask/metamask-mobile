import React from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { colors } from '../../../../styles/common';
import BaseNotification from './../BaseNotification';
import Device from '../../../../util/Device';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	modalTypeView: {
		position: 'absolute',
		bottom: 0,
		paddingBottom: Device.isIphoneX() ? 20 : 10,
		left: 0,
		right: 0,
		backgroundColor: colors.transparent
	},
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 70 : 60
	},
	notificationContainer: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	}
});

function SimpleNotification(props) {
	const {
		isInBrowserView,
		notificationAnimated,
		hideTransactionNotification,
		notificationTitle,
		notificationDescription,
		notificationStatus
	} = props;

	return (
		<ElevatedView style={[styles.modalTypeView, isInBrowserView && styles.modalTypeViewBrowser]} elevation={100}>
			<Animated.View
				style={[styles.notificationContainer, { transform: [{ translateY: notificationAnimated }] }]}
			>
				<BaseNotification
					status={notificationStatus}
					data={{ title: notificationTitle, description: notificationDescription }}
					onHide={hideTransactionNotification}
				/>
			</Animated.View>
		</ElevatedView>
	);
}

SimpleNotification.propTypes = {
	isInBrowserView: PropTypes.bool,
	notificationAnimated: PropTypes.object,
	/**
	 * function that dismisses de modal
	 */
	hideTransactionNotification: PropTypes.func,
	/**
	 * Title for notification if defined
	 */
	notificationTitle: PropTypes.string,
	/**
	 * Description for notification if defined
	 */
	notificationDescription: PropTypes.string,
	/**
	 * Status for notification if defined
	 */
	notificationStatus: PropTypes.string
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	notificationTitle: state.notification.title,
	notificationStatus: state.notification.status,
	notificationDescription: state.notification.description
});

export default connect(mapStateToProps)(SimpleNotification);
