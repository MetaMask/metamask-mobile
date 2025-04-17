import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import ExpandableSection from '../../UI/expandable-section';
import AccountNetworkInfoCollapsed from './account-network-info-collapsed';
import AccountNetworkInfoExpanded from './account-network-info-expanded';

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
      testID={ConfirmationPageSectionsSelectorIDs.ACCOUNT_NETWORK_SECTION}
    />
  );
};

export default AccountNetworkInfo;
