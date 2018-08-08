import Engine from './Engine';

describe('Engine', () => {
	it('should expose an API', () => {
		expect(Engine.api).toHaveProperty('accountTracker');
		expect(Engine.api).toHaveProperty('addressBook');
		expect(Engine.api).toHaveProperty('blockHistory');
		expect(Engine.api).toHaveProperty('currencyRate');
		expect(Engine.api).toHaveProperty('keyring');
		expect(Engine.api).toHaveProperty('network');
		expect(Engine.api).toHaveProperty('networkStatus');
		expect(Engine.api).toHaveProperty('phishing');
		expect(Engine.api).toHaveProperty('preferences');
		expect(Engine.api).toHaveProperty('shapeShift');
		expect(Engine.api).toHaveProperty('tokenRates');
	});
});
