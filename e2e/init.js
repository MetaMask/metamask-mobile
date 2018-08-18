import * as Pkg from '../package.json'; // eslint-disable-line import/no-namespace
const { config } = Pkg.detox;

import detox from 'detox';

import adapter from 'detox/runners/jest/adapter';

jest.setTimeout(120000);
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
