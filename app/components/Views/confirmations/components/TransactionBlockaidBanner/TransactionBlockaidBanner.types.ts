import { BlockaidBannerProps } from '@components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';

export type TransactionBlockaidBannerProps = Omit<
  BlockaidBannerProps,
  'securityAlertResponse'
> & {
  transactionId?: string;
};
