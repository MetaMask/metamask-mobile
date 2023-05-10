/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import BannerAlert from './BannerAlert';
import { BannerAlertProps, BannerAlertSeverity } from './BannerAlert.types';
import {
  DEFAULT_BANNERALERT_SEVERITY,
  SAMPLE_BANNERALERT_TITLE,
  SAMPLE_BANNERALERT_DESCRIPTION,
  SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
} from './BannerAlert.constants';

export const getBannerAlertStoryProps = (): BannerAlertProps => {
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
      onPress: () => console.log('actionButton clicked!'),
    },
    onClose: () => console.log('closeButton clicked!'),
  };
};

const BannerAlertStory = () => <BannerAlert {...getBannerAlertStoryProps()} />;

export default BannerAlertStory;
