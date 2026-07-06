import React, { useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  removeCurrentNotification,
  hideCurrentNotification,
} from '../../../actions/notification';
import { NotificationTypes } from '../../../util/notifications';
import TransactionNotification from './TransactionNotification';
import SimpleNotification from './SimpleNotification';
import { currentNotificationSelector } from '../../../reducers/notification';

import usePrevious from '../../hooks/usePrevious';
import { withTiming, Easing, runOnJS } from 'react-native-reanimated';

const { TRANSACTION, SIMPLE } = NotificationTypes;

function Notification({
  currentNotification,
  currentNotificationIsVisible,
  hideCurrentNotification,
  removeCurrentNotification,
}) {
  const prevNotificationIsVisible = usePrevious(currentNotificationIsVisible);

  const animatedTimingStart = useCallback((animatedRef, toValue, callback) => {
    animatedRef.value = withTiming(
      toValue,
      { duration: 500, easing: Easing.linear },
      () => callback && runOnJS(callback)(),
    );
  }, []);

  useEffect(
    () => () => {
      hideCurrentNotification();
      removeCurrentNotification();
    },
    [hideCurrentNotification, removeCurrentNotification],
  );

  useEffect(() => {
    if (!prevNotificationIsVisible && currentNotificationIsVisible) {
      hideCurrentNotification();
    }
  }, [
    hideCurrentNotification,
    currentNotificationIsVisible,
    prevNotificationIsVisible,
  ]);

  if (!currentNotification?.type) return null;
  if (currentNotification.type === TRANSACTION)
    return (
      <TransactionNotification
        onClose={hideCurrentNotification}
        onDismissComplete={removeCurrentNotification}
        dismissDuration={currentNotification.autodismiss}
        animatedTimingStart={animatedTimingStart}
        currentNotification={currentNotification}
      />
    );
  if (currentNotification.type === SIMPLE)
    return (
      <SimpleNotification
        onDismissComplete={removeCurrentNotification}
        dismissDuration={currentNotification.autodismiss}
        hideCurrentNotification={hideCurrentNotification}
        currentNotification={currentNotification}
      />
    );
  return null;
}

Notification.propTypes = {
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
