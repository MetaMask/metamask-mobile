import React from 'react';
import { ViewStyle } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../../component-library/components/Texts/Text';

interface TronUnstakingBannerProps {
  amount: string;
  style?: ViewStyle;
}

const TronUnstakingBanner = ({ amount, style }: TronUnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    style={style}
    description={
      <Text testID="tron-unstaking-banner">
        {strings('stake.tron.trx_unstaking_in_progress', { amount })}
      </Text>
    }
  />
);

export default TronUnstakingBanner;
