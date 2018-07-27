/**
 * Common styles and variables
 */
import './shim.js';
import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs
import { AppRegistry } from 'react-native';
import App from './app/components/App';
import { name } from './app.json';

AppRegistry.registerComponent(name, () => App);
