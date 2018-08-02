import './shim.js';
import 'crypto'; // eslint-disable-line import/no-nodejs-modules
import 'react-native-browser-polyfill'; // eslint-disable-line import/no-commonjs

import { AppRegistry } from 'react-native';
import App from './app/components/App';
import { name } from './app.json';

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => App);
