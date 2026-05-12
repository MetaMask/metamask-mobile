'use strict';

const path = require('node:path');
const { loadPreConditionRegistry } = require('./catalog');

// Load from the repo root (three levels up from lib/)
const appRoot = path.resolve(__dirname, '..', '..', '..', '..');
module.exports = loadPreConditionRegistry(appRoot);
