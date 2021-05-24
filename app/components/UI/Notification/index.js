import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { removeCurrentNotification, hideCurrentNotification } from '../../../actions/notification';
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
		hideCurrentNotification,
		removeCurrentNotification
	} = props;

	const notificationAnimated = useRef(new Animated.Value(200)).current;

	const usePrevious = value => {
		const ref = useRef();
		useEffect(() => {
			ref.current = value;
		});
		return ref.current;
	};

	const prevNotificationIsVisible = usePrevious(currentNotificationIsVisible);

	const animatedTimingStart = useCallback((animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	}, []);

	const isInBrowserView = useMemo(() => {
		const routes = navigation.dangerouslyGetState().routes;
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route?.routeName === BROWSER_ROUTE;
	}, [navigation]);

	useEffect(
		() => () => {
			animatedTimingStart(notificationAnimated, 200);
			hideCurrentNotification();
			removeCurrentNotification();
		},
		[notificationAnimated, animatedTimingStart, hideCurrentNotification, removeCurrentNotification]
	);

	useEffect(() => {
		if (!prevNotificationIsVisible && currentNotificationIsVisible) {
			animatedTimingStart(notificationAnimated, 0);
			setTimeout(() => {
				animatedTimingStart(notificationAnimated, 200);
				hideCurrentNotification();
				setTimeout(() => removeCurrentNotification(), 500);
			}, currentNotification.autodismiss || 5000);
		}
	}, [
		animatedTimingStart,
		hideCurrentNotification,
		removeCurrentNotification,
		currentNotificationIsVisible,
		prevNotificationIsVisible,
		currentNotification.autodismiss,
		notificationAnimated
	]);

	if (!currentNotification?.type) return null;
	if (currentNotification.type === TRANSACTION)
		return (
			<TransactionNotification
				onClose={hideCurrentNotification}
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
	hideCurrentNotification: PropTypes.func,
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
	hideCurrentNotification: () => dispatch(hideCurrentNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Notification);
