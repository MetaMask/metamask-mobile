import React from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../locales/i18n';
import { BannerProps } from 'app/component-library/components/Banners/Banner/Banner.types';

type UnstakingBannerProps = Pick<BannerProps, 'style'> & {
  amountEth: string;
  timeRemaining: {
    days: number;
    hours: number;
  };
};

const UnstakingBanner = ({
  amountEth,
  timeRemaining,
  style,
}: UnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    style={style}
    description={
      <Text>
        {strings('stake.banner_text.unstaking_in_progress', {
          amountEth,
          daysUntilClaimable: timeRemaining.days,
          daysCopy: strings('stake.day', { count: timeRemaining.days }),
          hoursUntilClaimable: timeRemaining.hours,
          hoursCopy: strings('stake.hour', {
            count: timeRemaining.hours,
          }),
        })}
      </Text>
    }
  />
);

export default UnstakingBanner;
