import Engine from './Engine';
describe('Engine', () => {
	it('should expose an API', () => {
		const engine = Engine.init({});
		expect(engine.datamodel.context).toHaveProperty('AccountTrackerController');
		expect(engine.datamodel.context).toHaveProperty('AddressBookController');
		expect(engine.datamodel.context).toHaveProperty('AssetsContractController');
		expect(engine.datamodel.context).toHaveProperty('AssetsController');
		expect(engine.datamodel.context).toHaveProperty('AssetsDetectionController');
		expect(engine.datamodel.context).toHaveProperty('CurrencyRateController');
		expect(engine.datamodel.context).toHaveProperty('KeyringController');
		expect(engine.datamodel.context).toHaveProperty('NetworkController');
		expect(engine.datamodel.context).toHaveProperty('PersonalMessageManager');
		expect(engine.datamodel.context).toHaveProperty('PhishingController');
		expect(engine.datamodel.context).toHaveProperty('PreferencesController');
		expect(engine.datamodel.context).toHaveProperty('TokenBalancesController');
		expect(engine.datamodel.context).toHaveProperty('TokenRatesController');
		expect(engine.datamodel.context).toHaveProperty('TypedMessageManager');
	});
});
