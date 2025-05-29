import React from 'react';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';

import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { SmartAccountUpdateSplash } from '../smart-account-update-splash';

export function Splash() {
  const { isUpgrade } = use7702TransactionType();
  const transactionMetadata = useTransactionMetadataRequest();

  if (!isUpgrade || transactionMetadata?.origin === ORIGIN_METAMASK) {
    return null;
  }

  return <SmartAccountUpdateSplash />;
}
