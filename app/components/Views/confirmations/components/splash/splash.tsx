import React from 'react';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';

import useApprovalRequest from '../../hooks/useApprovalRequest';
import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import { SmartAccountUpdateSplash } from '../smart-account-update-splash';

export function Splash() {
  const { approvalRequest } = useApprovalRequest();
  const { isUpgrade } = use7702TransactionType();

  if (!isUpgrade || approvalRequest?.origin === ORIGIN_METAMASK) {
    return null;
  }

  return <SmartAccountUpdateSplash />;
}
