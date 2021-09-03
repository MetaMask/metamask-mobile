import {
	generateTransferData,
	decodeTransferData,
	getMethodData,
	// isSmartContractAddress,
	// getTransactionActionKey,
	TOKEN_METHOD_TRANSFER,
	CONTRACT_METHOD_DEPLOY,
	// SEND_ETHER_ACTION_KEY,
	// DEPLOY_CONTRACT_ACTION_KEY,
	// SEND_TOKEN_ACTION_KEY,
	TOKEN_METHOD_TRANSFER_FROM,
	// TRANSFER_FROM_ACTION_KEY,
	// SMART_CONTRACT_INTERACTION_ACTION_KEY
} from '.';
// import Engine from '../core/Engine';

// const MOCK_ENGINE = {
// 	context: {
// 		TransactionController: {
// 			query(get, [address]) {
// 				if (address === '0x0') {
// 					return '0x';
// 				} else if (address === '0x1') {
// 					return '0x1';
// 				}
// 			}
// 		}
// 	}
// };

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

// describe('Transactions utils :: isSmartContractAddress', () => {
// 	it('isSmartContractAddress', async () => {
// 		Engine.context = MOCK_ENGINE.context;
// 		const isFirst = await isSmartContractAddress('0x0');
// 		const isSecond = await isSmartContractAddress('0x1');
// 		expect(isFirst).toEqual(false);
// 		expect(isSecond).toEqual(true);
// 	});

// 	it('isSmartContractAddress should work with contract map', async () => {
// 		Engine.context = MOCK_ENGINE.context;
// 		const stub = spyOn(Engine.context.TransactionController, 'query');
// 		await isSmartContractAddress('0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359');
// 		expect(stub).not.toBeCalled();
// 	});

// 	it('isSmartContractAddress should call query if not cached', async () => {
// 		Engine.context = MOCK_ENGINE.context;
// 		const stub = spyOn(Engine.context.TransactionController, 'query');
// 		await isSmartContractAddress('0x1', '0x123');
// 		expect(stub).toBeCalled();
// 	});

// 	it('isSmartContractAddress should call query if only address was provided', async () => {
// 		Engine.context = MOCK_ENGINE.context;
// 		const stub = spyOn(Engine.context.TransactionController, 'query');
// 		await isSmartContractAddress('0x1');
// 		expect(stub).toBeCalled();
// 	});
// });

// describe('Transactions utils :: getTransactionActionKey', () => {
// 	Engine.context = MOCK_ENGINE.context;
// 	const transferData =
// 		'0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001';
// 	const contractData =
// 		'0x60a060405260046060527f48302e31000000000000000000000000000000000000000000000000000000006080526006805460008290527f48302e310000000000000000000000000000000000000000000000000000000882556100b5907ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f602060026001841615610100026000190190931692909204601f01919091048101905b8082111561017957600081556001016100a1565b505060405161094b38038061094b833981';
// 	const randomData = '0x987654321';
// 	const transferFromData = '0x23b872dd0000000000000000000000000000';
// 	it('getTransactionActionKey send ether', async () => {
// 		const get = await getTransactionActionKey({ transactionHash: '0x1', transaction: { to: '0x0' } });
// 		expect(get).toEqual(SEND_ETHER_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey send ether with empty data', async () => {
// 		const get = await getTransactionActionKey({ transactionHash: '0x1', transaction: { data: '0x', to: '0x0' } });
// 		expect(get).toEqual(SEND_ETHER_ACTION_KEY);
// 	});
// 	it('getTransactionActionKey send token', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x2',
// 			transaction: { data: transferData, to: '0x0' }
// 		});
// 		expect(get).toEqual(SEND_TOKEN_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey send collectible', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x6',
// 			transaction: { data: transferFromData, to: '0x0' }
// 		});
// 		expect(get).toEqual(TRANSFER_FROM_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey deploy contract', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x3',
// 			transaction: { data: contractData, to: '0x1' }
// 		});
// 		expect(get).toEqual(DEPLOY_CONTRACT_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey send ether to contract', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x4',
// 			transaction: { data: randomData, to: '0x1' }
// 		});
// 		expect(get).toEqual(SMART_CONTRACT_INTERACTION_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey send ether to address', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x5',
// 			transaction: { to: '0x0' }
// 		});
// 		expect(get).toEqual(SEND_ETHER_ACTION_KEY);
// 	});

// 	it('getTransactionActionKey unknown interaction with smart contract', async () => {
// 		const get = await getTransactionActionKey({
// 			transactionHash: '0x7',
// 			transaction: { data: randomData, to: '0x1' }
// 		});
// 		expect(get).toEqual(SMART_CONTRACT_INTERACTION_ACTION_KEY);
// 	});
// });
