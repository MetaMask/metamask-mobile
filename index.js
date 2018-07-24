/**
 * Common styles and variables
 */
import './shim.js';
import crypto from 'crypto';
require('react-native-browser-polyfill');

import App from './app/components/App';
import { AppRegistry } from 'react-native';
import { name } from './app.json';

AppRegistry.registerComponent(name, () => App);
