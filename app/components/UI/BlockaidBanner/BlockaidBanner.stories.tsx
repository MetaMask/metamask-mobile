/* eslint-disable no-console */
import React from 'react';

import { select, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

import {
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_TITLE,
} from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import { storybookPropsGroupID } from '../../../component-library/constants/storybook.constants';
import BlockaidBanner from './BlockaidBanner';
import { BlockaidBannerProps, FlagType, Reason } from './BlockaidBanner.types';

export const getBlockaidBannerStoryProps = (): BlockaidBannerProps => {
  const flagTypeSelector = select(
    'flagType',
    FlagType,
    FlagType.Warning,
    storybookPropsGroupID,
  );

  const reasonSelector = select(
    'reason',
    Reason,
    Reason.approvalFarming,
    storybookPropsGroupID,
  );

  const title = text('title', SAMPLE_BANNERALERT_TITLE, storybookPropsGroupID);
  const description = text(
    'description',
    SAMPLE_BANNERALERT_DESCRIPTION,
    storybookPropsGroupID,
  );

  return {
    title,
    description,
    reason: reasonSelector,
    flagType: flagTypeSelector,
    features: [
      'Operator is an EOA',
      'Operator is untrusted according to previous activity',
    ],
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
