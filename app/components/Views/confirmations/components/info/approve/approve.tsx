import React, { useEffect } from 'react';
import { View } from 'react-native';

import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row';
import { ApproveRow } from '../../rows/transactions/approve-row';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import { NetworkAndOriginRow } from '../../rows/transactions/network-and-origin-row';

const Approve = () => {
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View testID={ConfirmationInfoComponentIDs.APPROVE}>
      <AccountNetworkInfoRow />
      <ApproveRow />
      <NetworkAndOriginRow />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default Approve;
