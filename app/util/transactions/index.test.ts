import { swapsUtils } from '@metamask/swaps-controller';
import { util } from '@metamask/controllers';

import {
	generateTransferData,
	decodeTransferData,
	getMethodData,
	getActionKey,
	TOKEN_METHOD_TRANSFER,
	CONTRACT_METHOD_DEPLOY,
	TOKEN_METHOD_TRANSFER_FROM,
} from '.';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

jest.mock('../../core/Engine');
const ENGINE_MOCK = Engine as jest.MockedClass<any>;

ENGINE_MOCK.context = {
	TransactionController: {
		ethQuery: null,
	},
};

const MOCK_ADDRESS1 = '0x0001';
const MOCK_ADDRESS2 = '0x0002';

const UNI_TICKER = 'UNI';
const UNI_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

const MOCK_CHAIN_ID = '1';

const spyOnQueryMethod = (returnValue: string | undefined) => {
	jest.spyOn(util, 'query').mockImplementation(
		() =>
			new Promise<string | undefined>((resolve) => {
				resolve(returnValue);
			})
	);
};

describe('Transactions utils :: generateTransferData', () => {
	it('generateTransferData should throw if undefined values', () => {
		expect(() => generateTransferData()).toThrow();
		expect(() => generateTransferData('transfer')).toThrow();
		expect(() => generateTransferData('transfer', { toAddress: '0x0' })).toThrow();
		expect(() => generateTransferData('transfer', { amount: 1 })).toThrow();
		expect(() => generateTransferData('transfer', { toAddress: '0x0', amount: 1 })).not.toThrow();
	});

	it('generateTransferData generates data correctly', () => {
		expect(
			generateTransferData('transfer', { toAddress: '0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589a0', amount: 1 })
		).toEqual(
			'0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001'
		);
	});
});

describe('Transactions utils :: decodeTransferData', () => {
	it('decodeTransferData transfer', () => {
		const [address, amount] = decodeTransferData(
			'transfer',
			'0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001'
		);
		expect(address).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589a0');
		expect(amount).toEqual('1');
	});

	it('decodeTransferData ERC721', () => {
		const [fromAddress, toAddress, tokenId] = decodeTransferData(
			'transferFrom',
			'0x23b872dd00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589c900000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589b400000000000000000000000000000000000000000000000000000000000004f1'
		);
		expect(fromAddress).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589c9');
		expect(toAddress).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589b4');
		expect(tokenId).toEqual('1265');
	});
});

describe('Transactions utils :: getMethodData', () => {
	it('getMethodData', async () => {
		const transferData =
			'0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001';
		const contractData =
			'0x60a060405260046060527f48302e31000000000000000000000000000000000000000000000000000000006080526006805460008290527f48302e310000000000000000000000000000000000000000000000000000000882556100b5907ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f602060026001841615610100026000190190931692909204601f01919091048101905b8082111561017957600081556001016100a1565b505060405161094b38038061094b833981';
		const randomData = '0x987654321000000000';
		const transferFromData = '0x23b872dd0000000000000000000000000000';
		const firstMethodData = await getMethodData(transferData);
		const secondtMethodData = await getMethodData(contractData);
		const thirdMethodData = await getMethodData(transferFromData);
		const fourthMethodData = await getMethodData(randomData);
		expect(firstMethodData.name).toEqual(TOKEN_METHOD_TRANSFER);
		expect(secondtMethodData.name).toEqual(CONTRACT_METHOD_DEPLOY);
		expect(thirdMethodData.name).toEqual(TOKEN_METHOD_TRANSFER_FROM);
		expect(fourthMethodData).toEqual({});
	});
});

describe('Transactions utils :: getActionKey', () => {
	beforeEach(() => {
		jest.spyOn(swapsUtils, 'getSwapsContractAddress').mockImplementation(() => 'SWAPS_CONTRACT_ADDRESS');
	});

	it('should be "Sent Yourself Ether"', async () => {
		spyOnQueryMethod(undefined);
		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS1,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.self_sent_ether'));
	});

	it('should be labeled as "Sent Yourself UNI"', async () => {
		spyOnQueryMethod(undefined);
		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS1,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, UNI_TICKER, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.self_sent_unit', { unit: UNI_TICKER }));
	});

	it('should be labeled as "Sent Ether"', async () => {
		spyOnQueryMethod(undefined);
		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS2,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.sent_ether'));
	});

	it('should be labeled as "Sent UNI"', async () => {
		spyOnQueryMethod(undefined);

		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS2,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, UNI_TICKER, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.sent_unit', { unit: UNI_TICKER }));
	});

	it('should be labeled as "Received Ether"', async () => {
		spyOnQueryMethod(undefined);

		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS2,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS2, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.received_ether'));
	});

	it('should be labeled as "Received UNI"', async () => {
		spyOnQueryMethod(undefined);
		const tx = {
			transaction: {
				from: MOCK_ADDRESS1,
				to: MOCK_ADDRESS2,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS2, UNI_TICKER, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.received_unit', { unit: UNI_TICKER }));
	});

	it('should be labeled as "Smart Contract Interaction" if the receiver is a smart contract', async () => {
		spyOnQueryMethod(UNI_ADDRESS);
		const tx = {
			transaction: {
				to: UNI_ADDRESS,
			},
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.smart_contract_interaction'));
	});

	it('should be labeled as "Smart Contract Interaction" if the tx is to a smart contract', async () => {
		spyOnQueryMethod(UNI_ADDRESS);
		const tx = {
			transaction: {
				to: UNI_ADDRESS,
			},
			toSmartContract: true,
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.smart_contract_interaction'));
	});

	it('should be labeled as "Contract Deployment" if the tx has no receiver', async () => {
		spyOnQueryMethod(UNI_ADDRESS);
		const tx = {
			transaction: {},
			toSmartContract: true,
		};
		const result = await getActionKey(tx, MOCK_ADDRESS1, undefined, MOCK_CHAIN_ID);
		expect(result).toBe(strings('transactions.contract_deploy'));
	});
});
