import React from 'react';
import Text from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import {
  BannerVariant,
  type BannerProps,
} from '../../../../../component-library/components/Banners/Banner/Banner.types';
import Banner, {
  BannerAlertSeverity,
} from '../../../../../component-library/components/Banners/Banner';

export type UnstakingBannerProps = Pick<BannerProps, 'style'>;

const UnstakeInputViewBanner = ({ style }: UnstakingBannerProps) => (
  <Banner
    severity={BannerAlertSeverity.Info}
    variant={BannerVariant.Alert}
    style={style}
    description={
      <Text>{strings('stake.unstake_input_banner_description')}</Text>
    }
  />
);

export default UnstakeInputViewBanner;
