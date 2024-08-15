import React from 'react';
import { TransactionBlockaidBannerProps } from './TransactionBlockaidBanner.types';
import BlockaidBanner from '../BlockaidBanner/BlockaidBanner';
import { useSelector } from 'react-redux';

const TransactionBlockaidBanner = (
  bannerProps: TransactionBlockaidBannerProps,
) => {
  const { transactionId, ...rest } = bannerProps;

  const transactionSecurityAlertResponses = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.transaction.transactionSecurityAlertResponses,
  );

  if (!transactionId) {
    return null;
  }

  const securityAlertResponse =
    transactionSecurityAlertResponses?.[transactionId];

  if (!securityAlertResponse) {
    return null;
  }

  return (
    <BlockaidBanner securityAlertResponse={securityAlertResponse} {...rest} />
  );
};

export default TransactionBlockaidBanner;
