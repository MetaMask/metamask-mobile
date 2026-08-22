import { NativeModules } from 'react-native';

// Minimizer module allows the app to be pushed to the background
const { Minimizer } = NativeModules;

/**
 * iOS-only bridge that writes token data into the home-screen widget's App Group
 * container and reloads the widget timelines. Undefined on Android and on builds
 * (e.g. Flask) that do not embed the widget extension — callers must no-op when
 * it is missing.
 */
const { RCTWidgetBridge } = NativeModules;

// TODO: add native modules named exports here
/* eslint-disable import-x/prefer-default-export */
export { Minimizer, RCTWidgetBridge as WidgetBridge };
