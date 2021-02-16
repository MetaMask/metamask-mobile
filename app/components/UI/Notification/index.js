import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { hideTransactionNotification } from '../../../actions/notification';
import notificationTypes from '../../../util/notifications';
import TransactionNotification from './TransactionNotification';
import SimpleNotification from './SimpleNotification';

const { TRANSACTION, SIMPLE } = notificationTypes;

const BROWSER_ROUTE = 'BrowserView';

function Notification(props) {
	const { autodismiss, isVisible, navigation, hideTransactionNotification, notificationType } = props;

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

	useEffect(() => {
		hideTransactionNotification();
	}, [hideTransactionNotification]);

	useEffect(() => {
		if (!prevIsVisible && isVisible) {
			// Auto dismiss notification in case of confirmations
			autodismiss && setTimeout(() => hideTransactionNotification(), autodismiss);
			setInternalIsVisible(true);
			setTimeout(() => animatedTimingStart(notificationAnimated, 0), 100);
		} else if (prevIsVisible && !isVisible) {
			animatedTimingStart(notificationAnimated, 200);
			setTimeout(() => setInternalIsVisible(false), 500);
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
	if (notificationType === SIMPLE)
		return <SimpleNotification isInBrowserView={isInBrowserView} notificationAnimated={notificationAnimated} />;
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
	 * Type of notification, transaction or simple
	 */
	notificationType: PropTypes.string
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	isVisible: state.notification.isVisible,
	autodismiss: state.notification.autodismiss,
	notificationType: state.notification.type
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Notification);
