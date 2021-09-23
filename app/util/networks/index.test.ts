import { isMainNet, getNetworkName, getAllNetworks, getNetworkTypeById } from '.';
import { MAINNET, ROPSTEN, GOERLI, RPC, KOVAN } from '../../../app/constants/network';

describe('getAllNetworks', () => {
	const allNetworks = getAllNetworks();
	it('should get all networks', () => {
		expect(allNetworks.includes(MAINNET)).toEqual(true);
		expect(allNetworks.includes(ROPSTEN)).toEqual(true);
		expect(allNetworks.includes(GOERLI)).toEqual(true);
	});
	it('should exclude rpc', () => {
		expect(allNetworks.includes(RPC)).toEqual(false);
	});
});

describe('isMainNet', () => {
	it(`should return true if the selected network is ${MAINNET}`, () => {
		expect(isMainNet('1')).toEqual(true);
		expect(
			isMainNet({
				provider: {
					type: MAINNET,
				},
			})
		).toEqual(true);
	});
	it(`should return false if the selected network is not ${MAINNET}`, () => {
		expect(isMainNet('42')).toEqual(false);
		expect(
			isMainNet({
				network: {
					provider: {
						type: ROPSTEN,
					},
				},
			})
		).toEqual(false);
	});
});

describe('getNetworkName', () => {
	it(`should get network name for ${MAINNET} id`, () => {
		const main = getNetworkName(String(1));
		expect(main).toEqual(MAINNET);
	});

	it(`should get network name for ${ROPSTEN} id`, () => {
		const main = getNetworkName(String(3));
		expect(main).toEqual(ROPSTEN);
	});

	it(`should get network name for ${KOVAN} id`, () => {
		const main = getNetworkName(String(42));
		expect(main).toEqual(KOVAN);
	});

	it(`should return undefined for unknown network id`, () => {
		const main = getNetworkName(String(99));
		expect(main).toEqual(undefined);
	});
});

describe('getNetworkTypeById', () => {
	it('should get network type by Id', () => {
		const type = getNetworkTypeById(42);
		expect(type).toEqual(KOVAN);
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
