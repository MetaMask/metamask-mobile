/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { BannerAlertSeverity } from './BannerAlert.types';
import { default as BannerAlertComponent } from './BannerAlert';
import { SAMPLE_BANNERALERT_PROPS } from './BannerAlert.constants';

const BannerAlertMeta = {
  title: 'Component Library / Banners',
  component: BannerAlertComponent,
  argTypes: {
    severity: {
      options: BannerAlertSeverity,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BANNERALERT_PROPS.severity,
    },
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERALERT_PROPS.title,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERALERT_PROPS.description,
    },
  },
};
export default BannerAlertMeta;

export const BannerAlert = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <BannerAlertComponent
      {...args}
      actionButtonProps={SAMPLE_BANNERALERT_PROPS.actionButtonProps}
    />
  ),
};
