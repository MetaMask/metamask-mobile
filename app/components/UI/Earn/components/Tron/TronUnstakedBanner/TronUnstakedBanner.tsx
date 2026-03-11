import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import { Text } from '@metamask/design-system-react-native';
import { TronUnstakedBannerTestIds } from './TronUnstakedBanner.testIds';

interface TronUnstakedBannerProps {
  amount: string;
}

const TronUnstakedBanner = ({ amount }: TronUnstakedBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Success}
    variant={BannerVariant.Alert}
    description={
      <Text testID={TronUnstakedBannerTestIds.BANNER_TEXT}>
        {strings('stake.tron.has_claimable_trx', { amount })}
      </Text>
    }
  />
);

export default TronUnstakedBanner;
