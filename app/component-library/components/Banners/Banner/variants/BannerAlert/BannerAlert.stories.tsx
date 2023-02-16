/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import BannerAlert from './BannerAlert';
import { BannerAlertProps, BannerAlertSeverity } from './BannerAlert.types';
import { DEFAULT_BANNER_ALERT_SEVERITY } from './BannerAlert.constants';

export const getBannerAlertStoryProps = (): BannerAlertProps => {
  const severitySelector = select(
    'severity',
    BannerAlertSeverity,
    DEFAULT_BANNER_ALERT_SEVERITY,
    storybookPropsGroupID,
  );

  const title = text(
    'title',
    'Sample Banner Alert Title',
    storybookPropsGroupID,
  );
  const description = text(
    'description',
    'Sample Banner Alert Description',
    storybookPropsGroupID,
  );
  const actionButtonLabel = text(
    'actionButtonLabel',
    'Sample Action Button Label',
    storybookPropsGroupID,
  );

  return {
    severity: severitySelector,
    title,
    description,
    actionButtonLabel,
    actionButtonOnPress: () => console.log('actionButton clicked!'),
    onClose: () => console.log('closeButton clicked!'),
  };
};

const BannerAlertStory = () => <BannerAlert {...getBannerAlertStoryProps()} />;

storiesOf('Component Library / Banners', module).add(
  'BannerAlert',
  BannerAlertStory,
);

export default BannerAlertStory;
