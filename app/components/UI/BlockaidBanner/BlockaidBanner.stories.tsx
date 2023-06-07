/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { BlockaidBannerProps } from './BlockaidBanner.types';
import { BannerAlertSeverity } from 'app/component-library/components/Banners/Banner';
import { select, text } from '@storybook/addon-knobs';
import {
  DEFAULT_BANNERALERT_SEVERITY,
  SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_TITLE,
} from 'app/component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import { storybookPropsGroupID } from 'app/component-library/constants/storybook.constants';
import { ButtonVariants } from 'app/component-library/components/Buttons/Button';
import BlockaidBanner from './BlockaidBanner';

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

  const attackDetails = text(
    'attackDetails',
    'Sample Attack Details',
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
    attackType: 'raw_signature_farming',
    attackDetails,
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
