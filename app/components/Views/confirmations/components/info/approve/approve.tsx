import React, { useEffect } from 'react';
import { View } from 'react-native';

import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';

const Approve = () => {
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfoRow />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default Approve;
