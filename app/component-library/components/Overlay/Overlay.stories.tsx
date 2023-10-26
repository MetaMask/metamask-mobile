/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { mockTheme } from '../../../util/theme';

// Internal dependencies.
import { default as OverlayComponent } from './Overlay';

const OverlayMeta = {
  title: 'Component Library / Overlay',
  component: OverlayComponent,
  argTypes: {
    color: {
      control: { type: 'color' },
      defaultValue: mockTheme.colors.overlay.default,
    },
  },
};
export default OverlayMeta;

export const Overlay = {
  render: (args: any) => (
    <OverlayComponent {...args} onPress={() => console.log("I'm clicked!")} />
  ),
};
