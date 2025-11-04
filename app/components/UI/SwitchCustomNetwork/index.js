import React from 'react';
import PropTypes from 'prop-types';
import PermissionSummary from '../PermissionsSummary';

/**
 * Account access approval component
 */
const SwitchCustomNetwork = ({
  customNetworkInformation,
  currentPageInformation,
  onCancel,
  onConfirm,
}) => (
  <PermissionSummary
    customNetworkInformation={customNetworkInformation}
    currentPageInformation={currentPageInformation}
    onCancel={onCancel}
    onConfirm={onConfirm}
    isDisconnectAllShown={false}
    isNetworkSwitch
    showPermissionsOnly
  />
);

SwitchCustomNetwork.propTypes = {
  /**
   * Object containing current page title, url, and icon href
   */
  currentPageInformation: PropTypes.object,
  /**
   * Callback triggered on account access approval
   */
  onConfirm: PropTypes.func,
  /**
   * Callback triggered on account access rejection
   */
  onCancel: PropTypes.func,
  /**
   * Object containing info of the network to add
   */
  customNetworkInformation: PropTypes.object,
};

export default SwitchCustomNetwork;
