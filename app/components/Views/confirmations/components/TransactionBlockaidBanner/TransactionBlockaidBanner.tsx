import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import BlockaidBanner from '../BlockaidBanner/BlockaidBanner';
import { TransactionBlockaidBannerProps } from './TransactionBlockaidBanner.types';

const TransactionBlockaidBanner = (
  bannerPropsPromise: Promise<TransactionBlockaidBannerProps>,
) => {
  const [bannerProps, setBannerProps] =
    useState<TransactionBlockaidBannerProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const securityAlertResponse = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.transaction.currentTransactionSecurityAlertResponse,
  );

  useEffect(() => {
    const fetchBannerProps = async () => {
      try {
        const resolvedBannerProps = await bannerPropsPromise;
        setBannerProps(resolvedBannerProps);
      } catch (error) {
        console.error('Failed to fetch banner props:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBannerProps();
  }, [bannerPropsPromise]);

  if (loading || !bannerProps) {
    return null;
  }

  const { transactionId, ...rest } = bannerProps;

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
