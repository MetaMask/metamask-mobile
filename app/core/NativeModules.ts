import { NativeModules } from 'react-native';

// Minimizer module allows the app to be pushed to the background
const { Minimizer } = NativeModules;

// TODO: add native modules named exports here
/* eslint-disable import-x/prefer-default-export */
export { Minimizer };
