import React, { useEffect } from 'react';
import { View } from 'react-native';

import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import AccountNetworkInfo from '../../rows/account-network-info-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import SwitchAccountTypeInfoRow from '../../rows/switch-account-type-info-row';

const SwitchAccountType = () => {
  const { trackPageViewedEvent } = useConfirmationMetricEvents();
  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfo />
      <SwitchAccountTypeInfoRow />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default SwitchAccountType;
