import Engine from './Engine';
describe('Engine', () => {
	it('should expose an API', () => {
		const engine = Engine.init({});
		expect(engine.datamodel.context).toHaveProperty('accountTracker');
		expect(engine.datamodel.context).toHaveProperty('addressBook');
		expect(engine.datamodel.context).toHaveProperty('blockHistory');
		expect(engine.datamodel.context).toHaveProperty('currencyRate');
		expect(engine.datamodel.context).toHaveProperty('keyring');
		expect(engine.datamodel.context).toHaveProperty('network');
		expect(engine.datamodel.context).toHaveProperty('networkStatus');
		expect(engine.datamodel.context).toHaveProperty('phishing');
		expect(engine.datamodel.context).toHaveProperty('preferences');
		expect(engine.datamodel.context).toHaveProperty('shapeShift');
		expect(engine.datamodel.context).toHaveProperty('tokenRates');
	});
});
