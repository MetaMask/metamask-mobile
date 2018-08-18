const config = require('../package.json').detox; // eslint-disable-line

import detox from 'detox';
import adapter from 'detox/runners/jest/adapter';

jest.setTimeout(60000);
jasmine.getEnv().addReporter(adapter);

beforeAll(async () => {
	await detox.init(config);
});

beforeEach(async () => {
	await adapter.beforeEach();
});

afterAll(async () => {
	await adapter.afterAll();
	await detox.cleanup();
});
