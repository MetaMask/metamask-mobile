// Metro swaps the app entry to this file when STORYBOOK_ENABLED=true.
// It must register a root component itself. index.js does not run.
import '../shim.js';
import '../app/core/NitroFetchSetup';
import '../app/core/NitroWebSocketSetup';
import 'react-native-gesture-handler';
import 'expo-asset';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hideAsync } from 'expo-splash-screen';
import { AppRegistry, LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LiteUI } from '@storybook/react-native-ui-lite';

import { name } from '../app.config.js';
import { view } from './storybook.requires';

LogBox.ignoreAllLogs();

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
});

const StorybookUI = view.getStorybookUI({
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

// The wallet root provides this. Storybook replaces that entry, and the
// design-system bottom sheet throws without a gesture root above it.
const StorybookUIRoot = () => (
  <GestureHandlerRootView style={styles.gestureRoot}>
    <StorybookUI />
  </GestureHandlerRootView>
);

AppRegistry.registerComponent(name, () => StorybookUIRoot);

// index.js keeps the native splash up until FoxLoader hides it. This entry
// replaces index.js, so dismiss the splash once Storybook is registered.
hideAsync().catch(() => undefined);
