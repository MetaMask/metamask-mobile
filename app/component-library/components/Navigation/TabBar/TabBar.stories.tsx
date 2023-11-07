/* eslint-disable no-labels */
/* eslint-disable no-console */

// Third party dependencies.
import React, { useState } from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';

// External dependencies.
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

// Internal dependencies.
import { default as TabBarComponent } from './TabBar';
import { TabBarIconKey } from './TabBar.types';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const rootReducer = (state = mockInitialState) => state;
const store = createStore(rootReducer);
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
          tabBarLabel: TabBarIconKey.Wallet,
          tabBarIconKey: TabBarIconKey.Wallet,
        },
      },
      BrowserRoute: {
        options: {
          tabBarLabel: TabBarIconKey.Browser,
          tabBarIconKey: TabBarIconKey.Browser,
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

  return <TabBarComponent {...mockTabBarProps} />;
};

const TabBarMeta = {
  title: 'Component Library / Navigation',
  decorators: [
    (Story: any) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

export default TabBarMeta;

export const TabBar = () => <TabBarStorybook />;
