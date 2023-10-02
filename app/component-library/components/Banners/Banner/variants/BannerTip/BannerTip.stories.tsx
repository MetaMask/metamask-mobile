// Internal dependencies.
import { BannerTipLogoType } from './BannerTip.types';
import { default as BannerTipComponent } from './BannerTip';
import { SAMPLE_BANNERTIP_PROPS } from './BannerTip.constants';

const BannerTipMeta = {
  title: 'Component Library / Banners',
  component: BannerTipComponent,
  argTypes: {
    logoType: {
      options: BannerTipLogoType,
      control: {
        type: 'select',
      },
    },
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERTIP_PROPS.title,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERTIP_PROPS.description,
    },
  },
};
export default BannerTipMeta;

export const BannerTip = {
  args: {
    actionButtonProps: SAMPLE_BANNERTIP_PROPS.actionButtonProps,
  },
};
