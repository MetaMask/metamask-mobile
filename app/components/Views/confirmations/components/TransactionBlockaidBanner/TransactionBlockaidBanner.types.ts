import { BlockaidBannerProps } from '../BlockaidBanner/BlockaidBanner.types';

export type TransactionBlockaidBannerProps = Omit<
  BlockaidBannerProps,
  'securityAlertResponse'
> & {
  transactionId?: string;
};
