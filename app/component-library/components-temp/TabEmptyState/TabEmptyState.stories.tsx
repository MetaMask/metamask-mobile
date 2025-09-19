import React from 'react';
import { Image } from 'react-native';
import { TabEmptyState as TabEmptyStateComponent } from './TabEmptyState';
import { useAssetFromTheme } from '../../../util/theme';
import emptyStatePerpsLight from '../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../images/empty-state-perps-dark.png';

// Themed icon component demonstrating light/dark image switching
const ThemedPerpsIcon = () => {
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  return <Image source={perpsImage} resizeMode="contain" />;
};

const TabEmptyStateMeta = {
  title: 'Components Temp / TabEmptyState',
  component: TabEmptyStateComponent,
  argTypes: {
    description: {
      control: { type: 'text' },
    },
    actionButtonText: {
      control: { type: 'text' },
    },
    icon: {
      control: { type: 'object' },
    },
  },
};

export default TabEmptyStateMeta;

// Default story with themed perps icon
export const Default = {
  args: {
    icon: <ThemedPerpsIcon />,
    description: 'No perpetual positions found',
    actionButtonText: 'Start Trading',
    onAction: () => {
      // eslint-disable-next-line no-console
      console.log('onAction');
    },
  },
};
