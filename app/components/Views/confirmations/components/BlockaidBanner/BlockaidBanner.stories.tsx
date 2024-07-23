/* eslint-disable no-console */
import React from 'react';

import { select, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

import {
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_TITLE,
} from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import { storybookPropsGroupID } from '../../../../../component-library/constants/storybook.constants';
import BlockaidBanner from './BlockaidBanner';
import { BlockaidBannerProps, Reason } from './BlockaidBanner.types';

// Assuming FlagType is not exported from BlockaidBanner.types and is not required for the story,
// we will use a local definition for the story's purposes.
// If FlagType is indeed exported from BlockaidBanner.types, this local definition should be removed
// and the import statement should be fixed to include FlagType.
enum FlagType {
  Warning = 'warning',
  Error = 'error',
  Info = 'info',
}

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
