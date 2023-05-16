/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import BannerAlertStory, {
  getBannerAlertStoryProps,
} from './variants/BannerAlert/BannerAlert.stories';
import BannerTipStory, {
  getBannerTipStoryProps,
} from './variants/BannerTip/BannerTip.stories';

// Internal dependencies.
import { BannerVariant, BannerProps } from './Banner.types';
import Banner from './Banner';
import { DEFAULT_BANNER_VARIANT } from './Banner.constants';

export const getBannerStoryProps = (): BannerProps => {
  let bannerProps: BannerProps;

  const bannerVariantsSelector = select(
    'variant',
    BannerVariant,
    DEFAULT_BANNER_VARIANT,
    storybookPropsGroupID,
  );
  switch (bannerVariantsSelector) {
    case BannerVariant.Alert:
      bannerProps = {
        variant: BannerVariant.Alert,
        ...getBannerAlertStoryProps(),
      };
      break;
    case BannerVariant.Tip:
      bannerProps = {
        variant: BannerVariant.Tip,
        ...getBannerTipStoryProps(),
      };
      break;
  }
  return bannerProps;
};
const BannerStory = () => <Banner {...getBannerStoryProps()} />;

storiesOf('Component Library / Banners', module)
  .add('Banner', BannerStory)
  .add('Variants / BannerAlert', BannerAlertStory)
  .add('Variants / BannerTip', BannerTipStory);

export default BannerStory;
