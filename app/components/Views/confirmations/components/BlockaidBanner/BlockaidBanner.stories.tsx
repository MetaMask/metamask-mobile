/* eslint-disable no-console */
import React from 'react';

import { text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

import {
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_TITLE,
} from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import { storybookPropsGroupID } from '../../../../../component-library/constants/storybook.constants';
import BlockaidBanner from './BlockaidBanner';
import { BlockaidBannerProps, Reason, ResultType } from './BlockaidBanner.types';

export const getBlockaidBannerStoryProps = (): BlockaidBannerProps => {
  const title = text('title', SAMPLE_BANNERALERT_TITLE, storybookPropsGroupID);
  const description = text(
    'description',
    SAMPLE_BANNERALERT_DESCRIPTION,
    storybookPropsGroupID,
  );

  return {
    title,
    description,
    securityAlertResponse: {
      reason: Reason.approvalFarming,
      result_type: ResultType.Warning,
    },
    onToggleShowDetails: () => console.log('Toggle show details'),
    onContactUsClicked: () => console.log('Contact us clicked'),
  };
};

const BlockaidBannerStory = () => (
  <BlockaidBanner {...getBlockaidBannerStoryProps()} />
);

storiesOf('Components / UI / BlockaidBanner', module).add(
  'BlockaidBanner',
  BlockaidBannerStory,
);

export default BlockaidBannerStory;