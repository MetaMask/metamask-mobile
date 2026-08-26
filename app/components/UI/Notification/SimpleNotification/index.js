import React from 'react';
import PropTypes from 'prop-types';
import BaseNotification from '../../../../component-library/components-temp/BaseNotification';

function SimpleNotification({
  hideCurrentNotification,
  onDismissComplete,
  dismissDuration,
  currentNotification,
}) {
  return (
    <BaseNotification
      status={currentNotification.status}
      data={{
        title: currentNotification.title,
        description: currentNotification.description,
      }}
      onHide={hideCurrentNotification}
      onDismissComplete={onDismissComplete}
      dismissDuration={dismissDuration}
    />
  );
}

SimpleNotification.propTypes = {
  currentNotification: PropTypes.object,
  hideCurrentNotification: PropTypes.func,
  onDismissComplete: PropTypes.func,
  dismissDuration: PropTypes.number,
};

export default SimpleNotification;
