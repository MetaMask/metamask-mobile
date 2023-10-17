/* eslint-disable no-console */

// Third party dependencies.

// External dependencies.

// Internal dependencies.
import { default as BannerAlertComponent } from './BannerAlert';
import {
  SAMPLE_BANNERALERT_PROPS,
  STORYBOOK_BANNERALERT_ARGTYPES,
} from './BannerAlert.constants';

const BannerAlertMeta = {
  title: 'Component Library / Banners',
  component: BannerAlertComponent,
  argTypes: STORYBOOK_BANNERALERT_ARGTYPES,
};
export default BannerAlertMeta;

export const BannerAlert = {
  args: SAMPLE_BANNERALERT_PROPS,
};
