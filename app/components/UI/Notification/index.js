import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { hideTransactionNotification } from '../../../actions/notification';
import { colors } from '../../../styles/common';
import notificationTypes from '../../../util/notifications';
import BaseNotification from './BaseNotification';
import Device from '../../../util/Device';
import ElevatedView from 'react-native-elevated-view';
import TransactionNotification from './TransactionNotification';

const { TRANSACTION, SIMPLE } = notificationTypes;

const BROWSER_ROUTE = 'BrowserView';

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

function Notification(props) {
	const {
		autodismiss,
		isVisible,
		navigation,
		hideTransactionNotification,
		notificationTitle,
		notificationDescription,
		notificationStatus,
		notificationType
	} = props;

	const [internalIsVisible, setInternalIsVisible] = useState(isVisible);

	const notificationAnimated = useRef(new Animated.Value(100)).current;

	const usePrevious = value => {
		const ref = useRef();
		useEffect(() => {
			ref.current = value;
		});
		return ref.current;
	};

	const prevIsVisible = usePrevious(isVisible);
	const prevNavigationState = usePrevious(navigation.state);

	const animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};
	const isInBrowserView = useMemo(() => {
		const routes = navigation.state.routes;
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route.routeName === BROWSER_ROUTE;
	}, [navigation.state]);

	const handleSimpleNotification = () => (
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

	useEffect(() => {
		hideTransactionNotification();
	}, [hideTransactionNotification]);

	useEffect(() => {
		if (!prevIsVisible && isVisible) {
			// Auto dismiss notification in case of confirmations
			autodismiss &&
				setTimeout(() => {
					hideTransactionNotification();
				}, autodismiss);
			setInternalIsVisible(true);
			setTimeout(() => animatedTimingStart(notificationAnimated, 0), 100);
		} else if (prevIsVisible && !isVisible) {
			animatedTimingStart(notificationAnimated, 200);
			setTimeout(() => {
				setInternalIsVisible(false);
			}, 500);
		}
	}, [
		isVisible,
		prevIsVisible,
		navigation.state,
		prevNavigationState,
		autodismiss,
		hideTransactionNotification,
		notificationAnimated
	]);

	if (!internalIsVisible) return null;
	if (notificationType === TRANSACTION)
		return (
			<TransactionNotification
				onClose={hideTransactionNotification}
				isInBrowserView={isInBrowserView}
				notificationAnimated={notificationAnimated}
				animatedTimingStart={animatedTimingStart}
			/>
		);
	if (notificationType === SIMPLE) return handleSimpleNotification();
	return null;
}

Notification.propTypes = {
	/**
    /* navigation object required to push new views
    */
	navigation: PropTypes.object,
	/**
	 * Boolean that determines if the modal should be shown
	 */
	isVisible: PropTypes.bool.isRequired,
	/**
	 * Number that determines when it should be autodismissed (in miliseconds)
	 */
	autodismiss: PropTypes.number,
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
	notificationStatus: PropTypes.string,
	/**
	 * Type of notification, transaction or simple
	 */
	notificationType: PropTypes.string
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	isVisible: state.notification.isVisible,
	autodismiss: state.notification.autodismiss,
	notificationTitle: state.notification.title,
	notificationStatus: state.notification.status,
	notificationDescription: state.notification.description,
	notificationType: state.notification.type
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Notification);
