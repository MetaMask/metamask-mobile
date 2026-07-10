import React, { useEffect, useCallback, useRef } from 'react';
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
  const dismissCompleteRef = useRef(false);

  const handleDismissComplete = useCallback(() => {
    if (dismissCompleteRef.current) {
      return;
    }

    dismissCompleteRef.current = true;
    removeCurrentNotification();
  }, [removeCurrentNotification]);

  useEffect(() => {
    dismissCompleteRef.current = false;
  }, [currentNotification?.id]);

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
      handleDismissComplete();
    },
    [hideCurrentNotification, handleDismissComplete],
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

  useEffect(() => {
    if (!currentNotification?.id) {
      return;
    }

    const dismissDuration = currentNotification.autodismiss || 5000;
    // BaseNotification normally dequeues via onDismissComplete after its exit
    // animation. Keep this fallback so the Redux queue still advances if that
    // callback never fires (for example, interrupted animations or unmount edge
    // cases). The extra second gives the animation time to finish first.
    const timeoutId = setTimeout(() => {
      handleDismissComplete();
    }, dismissDuration + 1000);

    return () => clearTimeout(timeoutId);
  }, [
    currentNotification?.id,
    currentNotification?.autodismiss,
    currentNotification?.status,
    currentNotification?.title,
    currentNotification?.description,
    handleDismissComplete,
  ]);

  if (!currentNotification?.type) return null;
  if (currentNotification.type === TRANSACTION)
    return (
      <TransactionNotification
        onClose={hideCurrentNotification}
        onDismissComplete={handleDismissComplete}
        dismissDuration={currentNotification.autodismiss}
        animatedTimingStart={animatedTimingStart}
        currentNotification={currentNotification}
      />
    );
  if (currentNotification.type === SIMPLE)
    return (
      <SimpleNotification
        onDismissComplete={handleDismissComplete}
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
