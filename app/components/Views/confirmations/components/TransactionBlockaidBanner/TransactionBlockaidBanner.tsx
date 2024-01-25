import React from 'react';
import { TransactionBlockaidBannerProps } from './TransactionBlockaidBanner.types';
import BlockaidBanner from '../BlockaidBanner/BlockaidBanner';
import { useSelector } from 'react-redux';

const TransactionBlockaidBanner = (
  bannerProps: TransactionBlockaidBannerProps,
) => {
  const { transactionId, ...rest } = bannerProps;

  const securityAlertResponse = useSelector(
    (state: any) => state.transaction.currentTransactionSecurityAlertResponse,
  );

  if (
    !transactionId ||
    !securityAlertResponse?.id ||
    securityAlertResponse.id !== transactionId
  ) {
    return null;
  }

  return (
    <BlockaidBanner
      securityAlertResponse={securityAlertResponse.response}
      {...rest}
    />
  );
};

export default TransactionBlockaidBanner;
