import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { removeCurrentNotification, hideTransactionNotification } from '../../../actions/notification';
import notificationTypes from '../../../util/notifications';
import TransactionNotification from './TransactionNotification';
import SimpleNotification from './SimpleNotification';
import { currentNotificationSelector } from '../../../reducers/notification';

const { TRANSACTION, SIMPLE } = notificationTypes;

const BROWSER_ROUTE = 'BrowserView';

function Notification(props) {
	const {
		currentNotification,
		currentNotificationIsVisible,
		navigation,
		hideTransactionNotification,
		removeCurrentNotification
	} = props;

	const notificationAnimated = useRef(new Animated.Value(100)).current;

	const usePrevious = value => {
		const ref = useRef();
		useEffect(() => {
			ref.current = value;
		});
		return ref.current;
	};

	const prevNotificationIsVisible = usePrevious(currentNotificationIsVisible);
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

	const hideAndRemoveNotification = useCallback(() => {
		hideTransactionNotification();
		setTimeout(() => removeCurrentNotification(), 500);
	}, [hideTransactionNotification, removeCurrentNotification]);

	useEffect(() => () => removeCurrentNotification(), [removeCurrentNotification]);

	useEffect(() => {
		if (!prevNotificationIsVisible && currentNotificationIsVisible) {
			// Auto dismiss notification in case of confirmations
			currentNotification.autodismiss &&
				setTimeout(() => {
					hideAndRemoveNotification();
				}, currentNotification.autodismiss);
			animatedTimingStart(notificationAnimated, 0);
		} else if (prevNotificationIsVisible && !currentNotificationIsVisible) {
			animatedTimingStart(notificationAnimated, 200);
			hideAndRemoveNotification();
		}
	}, [
		hideAndRemoveNotification,
		currentNotificationIsVisible,
		prevNotificationIsVisible,
		currentNotification.autodismiss,
		navigation.state,
		prevNavigationState,
		notificationAnimated
	]);

	if (!currentNotification.type) return null;
	if (currentNotification.type === TRANSACTION)
		return (
			<TransactionNotification
				onClose={hideTransactionNotification}
				isInBrowserView={isInBrowserView}
				notificationAnimated={notificationAnimated}
				animatedTimingStart={animatedTimingStart}
				currentNotification={currentNotification}
			/>
		);
	if (currentNotification.type === SIMPLE)
		return (
			<SimpleNotification
				isInBrowserView={isInBrowserView}
				notificationAnimated={notificationAnimated}
				currentNotification={currentNotification}
			/>
		);
	return null;
}

Notification.propTypes = {
	navigation: PropTypes.object,
	currentNotification: PropTypes.object,
	currentNotificationIsVisible: PropTypes.bool,
	hideTransactionNotification: PropTypes.func,
	removeCurrentNotification: PropTypes.func
};

const mapStateToProps = state => {
	const currentNotification = currentNotificationSelector(state.notification);
	return {
		currentNotification,
		currentNotificationIsVisible: Boolean(currentNotification.isVisible)
	};
};

const mapDispatchToProps = dispatch => ({
	removeCurrentNotification: () => dispatch(removeCurrentNotification()),
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Notification);
