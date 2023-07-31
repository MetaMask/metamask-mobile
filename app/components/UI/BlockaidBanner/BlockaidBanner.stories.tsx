/* eslint-disable no-console */
import React from 'react';

import { select, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import {
  DEFAULT_BANNERALERT_SEVERITY,
  SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_TITLE,
} from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { storybookPropsGroupID } from '../../../component-library/constants/storybook.constants';
import BlockaidBanner from './BlockaidBanner';
import { Reason, BlockaidBannerProps, FlagType } from './BlockaidBanner.types';

export const getBlockaidBannerStoryProps = (): BlockaidBannerProps => {
  const severitySelector = select(
    'severity',
    BannerAlertSeverity,
    DEFAULT_BANNERALERT_SEVERITY,
    storybookPropsGroupID,
  );

  const title = text('title', SAMPLE_BANNERALERT_TITLE, storybookPropsGroupID);
  const description = text(
    'description',
    SAMPLE_BANNERALERT_DESCRIPTION,
    storybookPropsGroupID,
  );
  const actionButtonLabel = text(
    'actionButtonLabel',
    SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
    storybookPropsGroupID,
  );

  return {
    severity: severitySelector,
    title,
    description,
    actionButtonProps: {
      label: actionButtonLabel,
      variant: ButtonVariants.Primary,
      onPress: () => console.log('actionButton clicked!'),
    },
    onClose: () => console.log('closeButton clicked!'),
    reason: Reason.rawSignatureFarming,
    flagType: FlagType.malicious,
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
