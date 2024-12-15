import React from 'react';

import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import ExpandableSection from '../../UI/ExpandableSection';
import AccountNetworkInfoCollapsed from './AccountNetworkInfoCollapsed';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';

const AccountNetworkInfo = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <ExpandableSection
      collapsedContent={<AccountNetworkInfoCollapsed />}
      expandedContent={<AccountNetworkInfoExpanded />}
      expandedContentTitle={strings('confirm.details')}
    />
  );
};

export default AccountNetworkInfo;
