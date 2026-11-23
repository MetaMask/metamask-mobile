// Metro swaps the app entry to this file when STORYBOOK_ENABLED=true.
// It must register a root component itself. index.js does not run.
import '../shim.js';
import '../app/core/NitroFetchSetup';
import '../app/core/NitroWebSocketSetup';
import 'react-native-gesture-handler';
import 'expo-asset';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hideAsync } from 'expo-splash-screen';
import { AppRegistry, LogBox } from 'react-native';

import { LiteUI } from '@storybook/react-native-ui-lite';

import { name } from '../app.config.js';
import { view } from './storybook.requires';

LogBox.ignoreAllLogs();

const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
  // The default UI menu is a @gorhom/bottom-sheet. Closed, it still covers the
  // bottom bar, so the menu press never lands. Lite UI is the drawer from
  // Storybook's Expo example.
  CustomUIComponent: LiteUI,
});

AppRegistry.registerComponent(name, () => StorybookUIRoot);

// index.js keeps the native splash up until FoxLoader hides it. This entry
// replaces index.js, so dismiss the splash once Storybook is registered.
hideAsync().catch(() => undefined);
