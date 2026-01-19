import React from 'react';

import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import Expandable from '../../UI/expandable';
import AccountNetworkInfoCollapsed from './account-network-info-collapsed';
import AccountNetworkInfoExpanded from './account-network-info-expanded';

const AccountNetworkInfo = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <Expandable
      collapsedContent={<AccountNetworkInfoCollapsed />}
      expandedContent={<AccountNetworkInfoExpanded />}
      expandedContentTitle={strings('confirm.details')}
      testID={ConfirmationRowComponentIDs.ACCOUNT_NETWORK}
    />
  );
};

export default AccountNetworkInfo;
