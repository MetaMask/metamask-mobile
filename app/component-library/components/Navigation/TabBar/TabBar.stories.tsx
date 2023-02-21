/* eslint-disable no-console */

// Third party dependencies.
import React, { useState } from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import TabBar from './TabBar';
import { TabBarLabel } from './TabBar.types';

const TabBarStorybook = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const routes = [
    { name: 'WalletRoute', key: 'WalletRoute' },
    { name: 'BrowserRoute', key: 'BrowserRoute' },
  ];
  const mockTabBarProps: any = {
    state: {
      routes,
      index: selectedIndex,
    },
    descriptors: {
      WalletRoute: {
        options: {
          tabBarLabel: TabBarLabel.Wallet,
        },
      },
      BrowserRoute: {
        options: {
          tabBarLabel: TabBarLabel.Browser,
        },
      },
    },
    navigation: {
      navigate: (routeName: string) => {
        const index = routes.findIndex(({ name }) => name === routeName);
        setSelectedIndex(index);
      },
    },
  };

  return <TabBar {...mockTabBarProps} />;
};

storiesOf('Component Library / TabBar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => <TabBarStorybook />);
