import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';

interface TronUnstakingBannerProps {
  amount: string;
}

const TronUnstakingBanner = ({ amount }: TronUnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    title={strings('stake.tron.unstaking_banner.title', { amount })}
    description={strings('stake.tron.unstaking_banner.description')}
  />
);

export default TronUnstakingBanner;
