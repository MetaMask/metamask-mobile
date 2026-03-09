import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import { Text } from '@metamask/design-system-react-native';
import { TronUnstakingBannerTestIds } from './TronUnstakingBanner.testIds';

interface TronUnstakingBannerProps {
  amount: string;
}

const TronUnstakingBanner = ({ amount }: TronUnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    description={
      <Text testID={TronUnstakingBannerTestIds.BANNER_TEXT}>
        {strings('stake.tron.trx_unstaking_in_progress', { amount })}
      </Text>
    }
  />
);

export default TronUnstakingBanner;
