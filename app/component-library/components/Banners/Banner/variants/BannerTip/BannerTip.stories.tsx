// Internal dependencies.
import { default as BannerTipComponent } from './BannerTip';
import {
  SAMPLE_BANNERTIP_PROPS,
  STORYBOOK_BANNERTIP_ARGTYPES,
} from './BannerTip.constants';

const BannerTipMeta = {
  title: 'Component Library / Banners',
  component: BannerTipComponent,
  argTypes: STORYBOOK_BANNERTIP_ARGTYPES,
};
export default BannerTipMeta;

export const BannerTip = {
  args: SAMPLE_BANNERTIP_PROPS,
};
