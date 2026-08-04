import { NativeModules } from 'react-native';

// Minimizer module allows the app to be pushed to the background
const { Minimizer } = NativeModules;

// RCTWidgetInfo (iOS only — see ios/MetaMask/NativeModules/RCTWidgetInfo/)
// bridges WidgetKit's WidgetCenter so app/core/Widgets/getInstalledWidgets.ios.ts
// can report which widgets the user has actually placed. undefined on Android.
const { RCTWidgetInfo } = NativeModules;

// TODO: add native modules named exports here
/* eslint-disable import-x/prefer-default-export */
export { Minimizer, RCTWidgetInfo };
