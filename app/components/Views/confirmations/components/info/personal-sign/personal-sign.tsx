import React from 'react';
import { View } from 'react-native';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import OriginRow from '../../rows/origin-row';
import Message from './message';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <View testID={ConfirmationInfoComponentIDs.PERSONAL_SIGN}>
      <AccountNetworkInfoRow />
      <OriginRow />
      <Message />
    </View>
  );
};

export default PersonalSign;
