import './shim.js';

import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs
import { AppRegistry, YellowBox } from 'react-native';
import Root from './app/components/Root';
import { name } from './app.json';

YellowBox.ignoreWarnings(['Module RNOS requires']);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => Root);
