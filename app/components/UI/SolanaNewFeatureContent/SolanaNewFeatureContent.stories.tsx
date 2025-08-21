/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
// Third party dependencies.
import React from 'react';

// Storybook decorators
import {
  withNavigation,
  withSafeArea,
} from '../../../../.storybook/decorators';

// Internal dependencies.
import { default as SolanaNewFeatureContentComponent } from './SolanaNewFeatureContent';

const SolanaNewFeatureContentMeta = {
  title: 'Components / UI / SolanaNewFeatureContent',
  component: SolanaNewFeatureContentComponent,
  decorators: [
    withNavigation,
    withSafeArea,
    (Story: React.ComponentType) => <Story />,
  ],
};

export default SolanaNewFeatureContentMeta;

// Default story - standard display
export const Default = {
  render: () => <SolanaNewFeatureContentComponent />,
};
