import React from 'react';
import { View } from 'react-native';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import { NetworkAndOriginRow } from '../../rows/transactions/network-and-origin-row';
import Message from './message';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';

const TypedSignV1 = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <View testID={ConfirmationInfoComponentIDs.SIGN_TYPED_DATA_V1}>
      <AccountNetworkInfoRow />
      <NetworkAndOriginRow />
      <Message />
    </View>
  );
};

export default TypedSignV1;
