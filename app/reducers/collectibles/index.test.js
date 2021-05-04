import { NetworksChainId } from '@metamask/controllers';
import reducer, { ADD_FAVORITE_COLLECTIBLE, REMOVE_FAVORITE_COLLECTIBLE } from './index';

const emptyAction = { type: null };

const collectibleA1 = { tokenId: 101, address: '0xA' };
// const collectibleA2 = { tokenId: 102, address: '0xA' }
// const collectibleB1 = { tokenId: 101, address: '0xB' }
// const collectibleB2 = { tokenId: 102, address: '0xB' }
const selectedAddressA = '0x0A';
// const selectedAddressB = '0x0B'

describe('swaps reducer', () => {
	it('should add favorite', () => {
		const initalState = reducer(undefined, emptyAction);
		const firstState = reducer(initalState, {
			type: ADD_FAVORITE_COLLECTIBLE,
			selectedAddress: selectedAddressA,
			chainId: NetworksChainId.mainnet,
			collectible: collectibleA1
		});
		expect(firstState).toEqual({
			favorites: { [selectedAddressA]: { [NetworksChainId.mainnet]: [collectibleA1] } }
		});
	});

	it('should remove collectible', () => {
		const firstState = { favorites: { [selectedAddressA]: { [NetworksChainId.mainnet]: [collectibleA1] } } };
		const secondState = reducer(firstState, {
			type: REMOVE_FAVORITE_COLLECTIBLE,
			selectedAddress: selectedAddressA,
			chainId: NetworksChainId.mainnet,
			collectible: collectibleA1
		});
		expect(secondState).toEqual({ favorites: { [selectedAddressA]: { [NetworksChainId.mainnet]: [] } } });
	});
});
