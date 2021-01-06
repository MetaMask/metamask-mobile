import { getNetworkName, getAllNetworks, getNetworkTypeById } from './networks';

describe('getAllNetworks', () => {
	const allNetworks = getAllNetworks();
	it('should get all networks', () => {
		expect(allNetworks.includes('mainnet')).toEqual(true);
		expect(allNetworks.includes('ropsten')).toEqual(true);
		expect(allNetworks.includes('goerli')).toEqual(true);
	});
	it('should exclude rpc', () => {
		expect(allNetworks.includes('rpc')).toEqual(false);
	});
});

describe('getNetworkName', () => {
	it('should get network name', () => {
		const main = getNetworkName(String(1));
		expect(main).toEqual('mainnet');
	});
});

describe('getNetworkTypeById', () => {
	it('should get network type by Id', () => {
		const type = getNetworkTypeById(42);
		expect(type).toEqual('kovan');
	});
	it('should fail if network Id is missing', () => {
		try {
			getNetworkTypeById();
		} catch (error) {
			expect(error.message).toEqual('Missing network Id');
		}
	});
	it('should fail if network Id is unknown', () => {
		const id = 9999;
		try {
			getNetworkTypeById(id);
		} catch (error) {
			expect(error.message).toEqual(`Unknown network with id ${id}`);
		}
	});
});
