import wallet_addEthereumChain from './wallet_addEthereumChain';

const correctParams = {
	chainId: '0x64',
	chainName: 'xDai',
	blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
	nativeCurrency: { symbol: 'xDai', decimals: 18 },
	rpcUrls: ['https://rpc.xdaichain.com/'],
	extraKey: 1
};

const otherOptions = {
	res: {},
	addCustomNetworkRequest: {},
	switchCustomNetworkRequest: {},
	frequentRpcList: [],
	networkProvider: { chainId: '1' }
};

describe('RPC Method - wallet_addEthereumChain', () => {
	it('should report missing params', async () => {
		try {
			await wallet_addEthereumChain({
				req: {
					params: null
				},
				...otherOptions
			});
		} catch (error) {
			expect(error.message).toContain('Expected single, object parameter.');
		}
	});

	it('should report extra keys', async () => {
		try {
			await wallet_addEthereumChain({
				req: {
					params: [{ ...correctParams, extraKey: 10 }]
				},
				...otherOptions
			});
		} catch (error) {
			expect(error.message).toContain('Received unexpected keys on object parameter. Unsupported keys');
		}
	});
});
