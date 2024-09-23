import { BannerProps } from '../../../../../../../component-library/components/Banners/Banner/Banner.types';

export type UnstakingBannerProps = Pick<BannerProps, 'style'> & {
  timeRemaining: {
    days: number;
    hours: number;
  };
  amountEth: string | null;
};
