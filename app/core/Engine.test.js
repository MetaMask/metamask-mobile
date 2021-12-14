import Engine from './Engine';
describe('Engine', () => {
	it('should expose an API', () => {
		const engine = Engine.init({});
		expect(engine.context).toHaveProperty('AccountTrackerController');
		expect(engine.context).toHaveProperty('AddressBookController');
		expect(engine.context).toHaveProperty('AssetsContractController');
		expect(engine.context).toHaveProperty('TokenListController');
		expect(engine.context).toHaveProperty('TokenDetectionController');
		expect(engine.context).toHaveProperty('CollectibleDetectionController');
		expect(engine.context).toHaveProperty('CollectiblesController');
		expect(engine.context).toHaveProperty('CurrencyRateController');
		expect(engine.context).toHaveProperty('KeyringController');
		expect(engine.context).toHaveProperty('NetworkController');
		expect(engine.context).toHaveProperty('PersonalMessageManager');
		expect(engine.context).toHaveProperty('PhishingController');
		expect(engine.context).toHaveProperty('PreferencesController');
		expect(engine.context).toHaveProperty('TokenBalancesController');
		expect(engine.context).toHaveProperty('TokenRatesController');
		expect(engine.context).toHaveProperty('TokensController');
		expect(engine.context).toHaveProperty('TypedMessageManager');
	});
});
