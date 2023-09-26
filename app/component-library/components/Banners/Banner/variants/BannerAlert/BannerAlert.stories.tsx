// Internal dependencies.
import { BannerAlertSeverity } from './BannerAlert.types';
import { default as BannerAlertComponent } from './BannerAlert';
import { SAMPLE_BANNERALERT_PROPS } from './BannerAlert.constants';

const BannerAlertMeta = {
  title: 'Component Library / Banners',
  component: BannerAlertComponent,
  argTypes: {
    severity: {
      options: Object.values(BannerAlertSeverity),
      mapping: Object.values(BannerAlertSeverity),
      control: {
        type: 'select',
        labels: Object.keys(BannerAlertSeverity),
      },
    },
  },
};
export default BannerAlertMeta;

export const BannerAlert = {
  args: SAMPLE_BANNERALERT_PROPS,
};
