import './shim.js';
import 'crypto'; // eslint-disable-line import/no-nodejs-modules
import 'react-native-browser-polyfill'; // eslint-disable-line import/no-commonjs

import { AppRegistry, YellowBox } from 'react-native';
import App from './app/components/App';
import { name } from './app.json';

YellowBox.ignoreWarnings(['Module RNOS requires']);
/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => App);
