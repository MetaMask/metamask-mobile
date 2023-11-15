import { BlockaidBannerProps } from '../BlockaidBanner/BlockaidBanner.types';

export type TransactionBlockaidBannerProps = BlockaidBannerProps & {
  transactionId?: string;
};
