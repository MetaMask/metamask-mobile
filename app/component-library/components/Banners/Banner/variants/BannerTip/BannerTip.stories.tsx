/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { BannerTipLogoType } from './BannerTip.types';
import { default as BannerTipComponent } from './BannerTip';
import { SAMPLE_BANNERTIP_PROPS } from './BannerTip.constants';

const BannerTipMeta = {
  title: 'Component Library / Banners',
  component: BannerTipComponent,
  argTypes: {
    logoType: {
      options: BannerTipLogoType,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BANNERTIP_PROPS.logoType,
    },
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERTIP_PROPS.title,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BANNERTIP_PROPS.description,
    },
  },
};
export default BannerTipMeta;

export const BannerTip = {
  render: (args: any) => (
    <BannerTipComponent
      {...args}
      actionButtonProps={SAMPLE_BANNERTIP_PROPS.actionButtonProps}
    />
  ),
};
