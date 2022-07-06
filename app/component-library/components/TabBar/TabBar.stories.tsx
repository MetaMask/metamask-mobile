/* eslint-disable no-console */
import React, { useState } from 'react';
import { storiesOf } from '@storybook/react-native';
import TabBar from './TabBar';
import { TabBarLabel } from './TabBar.types';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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

  return (
    <SafeAreaInsetsContext.Provider
      value={{ bottom: 24, top: 24, left: 24, right: 24 }}
    >
      <TabBar {...mockTabBarProps} />
    </SafeAreaInsetsContext.Provider>
  );
};

storiesOf('Component Library / TabBar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => <TabBarStorybook />);
