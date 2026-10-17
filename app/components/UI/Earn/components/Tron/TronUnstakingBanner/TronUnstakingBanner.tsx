import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

interface TronUnstakingBannerProps {
  amount: string;
}

const TronUnstakingBanner = ({ amount }: TronUnstakingBannerProps) => (
  <BannerAlert
    severity={BannerAlertSeverity.Info}
    title={strings('stake.tron.unstaking_banner.title', { amount })}
    description={strings('stake.tron.unstaking_banner.description')}
  />
);

export default TronUnstakingBanner;
