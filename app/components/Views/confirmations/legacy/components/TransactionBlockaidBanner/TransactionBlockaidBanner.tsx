import React from 'react';
import { useSelector } from 'react-redux';

import { selectCurrentTransactionSecurityAlertResponse } from '../../../../../../selectors/confirmTransaction';
import BlockaidBanner from '../BlockaidBanner/BlockaidBanner';
import { TransactionBlockaidBannerProps } from './TransactionBlockaidBanner.types';

const TransactionBlockaidBanner = (
  bannerProps: TransactionBlockaidBannerProps,
) => {
  const { transactionId, ...rest } = bannerProps;

  const securityAlertResponse = useSelector(
    selectCurrentTransactionSecurityAlertResponse,
  );

  if (!transactionId || !securityAlertResponse) {
    return null;
  }

  return (
    <BlockaidBanner securityAlertResponse={securityAlertResponse} {...rest} />
  );
};

export default TransactionBlockaidBanner;
