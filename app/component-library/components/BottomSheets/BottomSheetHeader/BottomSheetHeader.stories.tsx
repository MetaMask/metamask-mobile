/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetHeaderComponent } from './BottomSheetHeader';
import {
  BottomSheetHeaderAlignment,
  BottomSheetHeaderProps,
} from './BottomSheetHeader.types';

const BottomSheetHeaderMeta = {
  title: 'Component Library / BottomSheets / BottomSheetHeader',
  component: BottomSheetHeaderComponent,
  argTypes: {
    alignment: {
      control: { type: 'select' },
      options: Object.values(BottomSheetHeaderAlignment),
      defaultValue: BottomSheetHeaderAlignment.Center,
      description: 'Alignment of the header title',
    },
    children: {
      control: { type: 'text' },
      defaultValue: 'BottomSheetHeader Title',
    },
    onBack: {
      action: 'onBack',
    },
    onClose: {
      action: 'onClose',
    },
  },
};
export default BottomSheetHeaderMeta;

export const BottomSheetHeader = {
  args: {
    children: 'Super Long BottomSheetHeader Title that may span 3 lines',
    alignment: BottomSheetHeaderAlignment.Center,
  },
  render: (args: BottomSheetHeaderProps) => (
    <BottomSheetHeaderComponent
      {...args}
      onBack={() => {
        console.log('Back button clicked');
      }}
      onClose={() => {
        console.log('Close button clicked');
      }}
    />
  ),
};

export const CenterAligned = {
  args: {
    children: 'Center Aligned Title',
    alignment: BottomSheetHeaderAlignment.Center,
  },
  render: (args: BottomSheetHeaderProps) => (
    <BottomSheetHeaderComponent
      {...args}
      onBack={() => console.log('Back clicked')}
      onClose={() => console.log('Close clicked')}
    />
  ),
};

export const LeftAligned = {
  args: {
    children: 'Margin',
    alignment: BottomSheetHeaderAlignment.Left,
  },
  render: (args: BottomSheetHeaderProps) => (
      <BottomSheetHeaderComponent
        {...args}
        onClose={() => console.log('Close clicked')}
      />
    ),
};

export const LeftAlignedWithBack = {
  args: {
    children: 'Left Aligned with Back',
    alignment: BottomSheetHeaderAlignment.Left,
  },
  render: (args: BottomSheetHeaderProps) => (
    <BottomSheetHeaderComponent
      {...args}
      onBack={() => console.log('Back clicked')}
      onClose={() => console.log('Close clicked')}
    />
  ),
};

export const LeftAlignedLongTitle = {
  args: {
    children:
      "Margin is the money you put in to open a trade. It acts as collateral, and it's the most you can lose on that trade.",
    alignment: BottomSheetHeaderAlignment.Left,
  },
  render: (args: BottomSheetHeaderProps) => (
      <BottomSheetHeaderComponent
        onClose={() => console.log('Close clicked')}
        {...args}
      />
    ),
};
