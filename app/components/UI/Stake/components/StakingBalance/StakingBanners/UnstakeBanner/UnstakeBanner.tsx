import React from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { UnstakingBannerProps } from './UnstakeBanner.types';
import { renderUnstakingTimeRemaining } from './utils';

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
      <Text>{renderUnstakingTimeRemaining(timeRemaining, amountEth)}</Text>
    }
  />
);

export default UnstakingBanner;
