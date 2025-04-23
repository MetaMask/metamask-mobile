import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
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
      testID={ConfirmationPageSectionsSelectorIDs.ACCOUNT_NETWORK_SECTION}
    />
  );
};

export default AccountNetworkInfo;
