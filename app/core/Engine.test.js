import Engine from './Engine';

describe('Engine', () => {
	it('should expose an API', () => {
		const engine = new Engine();
		expect(engine.api).toHaveProperty('accountTracker');
		expect(engine.api).toHaveProperty('addressBook');
		expect(engine.api).toHaveProperty('blockHistory');
		expect(engine.api).toHaveProperty('currencyRate');
		expect(engine.api).toHaveProperty('keyring');
		expect(engine.api).toHaveProperty('network');
		expect(engine.api).toHaveProperty('networkStatus');
		expect(engine.api).toHaveProperty('phishing');
		expect(engine.api).toHaveProperty('preferences');
		expect(engine.api).toHaveProperty('shapeShift');
		expect(engine.api).toHaveProperty('tokenRates');
	});
});
