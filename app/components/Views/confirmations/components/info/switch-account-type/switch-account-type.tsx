import React, { useEffect } from 'react';
import { View } from 'react-native';

import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import AccountNetworkInfo from '../../rows/account-network-info-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import SwitchAccountTypeInfoRow from '../../rows/switch-account-type-info-row';

const SwitchAccountType = () => {
  const { trackPageViewedEvent } = useConfirmationMetricEvents();
  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfo />
      <SwitchAccountTypeInfoRow />
      <GasFeesDetails />
      <AdvancedDetailsRow />
    </View>
  );
};

export default SwitchAccountType;
