import { NetworksChainId } from '@metamask/controllers';
import AppConstants from '../core/AppConstants';
import { getAllNetworks, isSafeChainId } from '../util/networks';

export const migrations = {
	// Needed after https://github.com/MetaMask/controllers/pull/152
	0: state => {
		const addressBook = state.engine.backgroundState.AddressBookController.addressBook;
		const migratedAddressBook = {};
		Object.keys(addressBook).forEach(address => {
			const chainId = addressBook[address].chainId.toString();
			migratedAddressBook[chainId]
				? (migratedAddressBook[chainId] = { ...migratedAddressBook[chainId], [address]: addressBook[address] })
				: (migratedAddressBook[chainId] = { [address]: addressBook[address] });
		});
		state.engine.backgroundState.AddressBookController.addressBook = migratedAddressBook;
		return state;
	},
	// MakerDAO DAI => SAI
	1: state => {
		const tokens = state.engine.backgroundState.AssetsController.tokens;
		const migratedTokens = [];
		tokens.forEach(token => {
			if (token.symbol === 'DAI' && token.address.toLowerCase() === AppConstants.SAI_ADDRESS.toLowerCase()) {
				token.symbol = 'SAI';
			}
			migratedTokens.push(token);
		});
		state.engine.backgroundState.AssetsController.tokens = migratedTokens;

		return state;
	},
	2: state => {
		const provider = state.engine.backgroundState.NetworkController.provider;

		// Check if the current network is one of the initial networks
		const isInitialNetwork = provider.type && getAllNetworks().includes(provider.type);

		// Check if the current network has a valid chainId
		const chainIdNumber = parseInt(provider.chainId, 10);
		const isCustomRpcWithInvalidChainId = !isSafeChainId(chainIdNumber);

		if (!isInitialNetwork && isCustomRpcWithInvalidChainId) {
			// If the current network does not have a chainId, switch to testnet.
			state.engine.backgroundState.NetworkController.provider = {
				ticker: 'ETH',
				type: 'rinkeby'
			};
		}
		return state;
	},
	3: state => {
		const provider = state.engine.backgroundState.NetworkController.provider;
		const chainId = NetworksChainId[provider.type];
		// if chainId === '' is a rpc
		if (chainId) {
			state.engine.backgroundState.NetworkController.provider = { ...provider, chainId };
			return state;
		}

		// If provider is rpc, check if the current network has a valid chainId
		const storedChainId = typeof provider.chainId === 'string' ? provider.chainId : '';
		const isDecimalString = /^[1-9]\d*$/u.test(storedChainId);
		const hasInvalidChainId = !isDecimalString || !isSafeChainId(parseInt(storedChainId, 10));

		if (hasInvalidChainId) {
			// If the current network does not have a chainId, switch to testnet.
			state.engine.backgroundState.NetworkController.provider = {
				ticker: 'ETH',
				type: 'rinkeby',
				chainId: NetworksChainId.rinkeby
			};
		}
		return state;
	}
};

export const version = 3;
