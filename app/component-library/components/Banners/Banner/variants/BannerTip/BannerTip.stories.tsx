// Internal dependencies.
import { BannerTipLogoType } from './BannerTip.types';
import { default as BannerTipComponent } from './BannerTip';
import { SAMPLE_BANNERTIP_PROPS } from './BannerTip.constants';

const BannerTipMeta = {
  title: 'Component Library / Banners',
  component: BannerTipComponent,
  argTypes: {
    logoType: {
      options: Object.values(BannerTipLogoType),
      mapping: Object.values(BannerTipLogoType),
      control: {
        type: 'select',
        labels: Object.keys(BannerTipLogoType),
      },
    },
  },
};
export default BannerTipMeta;

export const BannerTip = {
  args: SAMPLE_BANNERTIP_PROPS,
};
