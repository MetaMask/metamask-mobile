import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getDecimalChainId } from '../../../util/networks';
import PermissionSummary from '../PermissionsSummary';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { useMetrics } from '../../../components/hooks/useMetrics';

/**
 * Account access approval component
 */
const SwitchCustomNetwork = ({
  customNetworkInformation,
  currentPageInformation,
  onCancel,
  onConfirm,
}) => {
  const { networkName } = useNetworkInfo(
    new URL(currentPageInformation.url).origin,
  );
  const { trackEvent, createEventBuilder } = useMetrics();

  const trackingData = useMemo(
    () => ({
      chain_id: getDecimalChainId(customNetworkInformation.chainId),
      from_network: networkName,
      to_network: customNetworkInformation.chainName,
    }),
    [customNetworkInformation, networkName],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_SWITCH_REQUESTED_AND_MODAL_SHOWN,
      )
        .addProperties(trackingData)
        .build(),
    );
  }, [trackEvent, trackingData, createEventBuilder]);

  return (
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
};

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
