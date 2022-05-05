import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { EasingNode } from 'react-native-reanimated';
import { useNavigationState } from '@react-navigation/native';
import {
  removeCurrentNotification,
  hideCurrentNotification,
} from '../../../actions/notification';
import notificationTypes from '../../../util/notifications';
import TransactionNotification from './TransactionNotification';
import SimpleNotification from './SimpleNotification';
import { currentNotificationSelector } from '../../../reducers/notification';

import { findRouteNameFromNavigatorState } from '../../../util/general';
import usePrevious from '../../hooks/usePrevious';

const { TRANSACTION, SIMPLE } = notificationTypes;

const BROWSER_ROUTE = 'BrowserView';

function Notification({
  currentNotification,
  currentNotificationIsVisible,
  navigation,
  hideCurrentNotification,
  removeCurrentNotification,
}) {
  const notificationAnimated = useRef(new Animated.Value(200)).current;
  const routes = useNavigationState((state) => state.routes);

  const prevNotificationIsVisible = usePrevious(currentNotificationIsVisible);

  const animatedTimingStart = useCallback((animatedRef, toValue, callback) => {
    Animated.timing(animatedRef, {
      toValue,
      duration: 500,
      easing: EasingNode.linear,
      useNativeDriver: true,
    }).start(({ finished }) => finished && callback?.());
  }, []);

  const isInBrowserView = useMemo(
    () => findRouteNameFromNavigatorState(routes) === BROWSER_ROUTE,
    [routes],
  );

  useEffect(
    () => () => {
      animatedTimingStart(notificationAnimated, 200, removeCurrentNotification);
      hideCurrentNotification();
    },
    [
      notificationAnimated,
      animatedTimingStart,
      hideCurrentNotification,
      removeCurrentNotification,
    ],
  );

  useEffect(() => {
    if (!prevNotificationIsVisible && currentNotificationIsVisible) {
      animatedTimingStart(notificationAnimated, 0);
      hideCurrentNotification();
      setTimeout(() => {
        animatedTimingStart(
          notificationAnimated,
          200,
          removeCurrentNotification,
        );
      }, currentNotification.autodismiss || 5000);
    }
  }, [
    animatedTimingStart,
    hideCurrentNotification,
    removeCurrentNotification,
    currentNotificationIsVisible,
    prevNotificationIsVisible,
    currentNotification.autodismiss,
    notificationAnimated,
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
  removeCurrentNotification: PropTypes.func,
};

const mapStateToProps = (state) => {
  const currentNotification = currentNotificationSelector(state.notification);
  return {
    currentNotification,
    currentNotificationIsVisible: Boolean(currentNotification.isVisible),
  };
};

const mapDispatchToProps = (dispatch) => ({
  removeCurrentNotification: () => dispatch(removeCurrentNotification()),
  hideCurrentNotification: () => dispatch(hideCurrentNotification()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Notification);
