import React from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { renderUnstakingTimeRemaining } from './utils';
import { BannerProps } from '../../../../../../../component-library/components/Banners/Banner/Banner.types';

export type UnstakingBannerProps = Pick<BannerProps, 'style'> & {
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  amountEth: string;
};

const UnstakingBanner = ({
  timeRemaining,
  amountEth,
  style,
}: UnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    style={style}
    description={
      <Text testID="unstaking-banner">
        {renderUnstakingTimeRemaining(timeRemaining, amountEth)}
      </Text>
    }
  />
);

export default UnstakingBanner;
