import { NetworksChainId } from '@metamask/controller-utils';
import reducer, {
  ADD_FAVORITE_COLLECTIBLE,
  REMOVE_FAVORITE_COLLECTIBLE,
} from './index';

const emptyAction = { type: null };

const collectibleA1 = { tokenId: '101', address: '0xA' };
const collectibleA2 = { tokenId: '102', address: '0xA' };
const collectibleB1 = { tokenId: '101', address: '0xB' };
const collectibleB2 = { tokenId: '102', address: '0xB' };
const selectedAddressA = '0x0A';
const selectedAddressB = '0x0B';

describe('swaps reducer', () => {
  it('should add favorite', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(firstState).toEqual({
      favorites: {
        [selectedAddressA]: { [NetworksChainId.mainnet]: [collectibleA1] },
      },
    });
  });

  it('should add favorite by selectedAddress', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1],
        },
        [selectedAddressB]: {
          [NetworksChainId.mainnet]: [collectibleA2],
        },
      },
    });
  });

  it('should add favorite by chainId', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.rinkeby,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1],
          [NetworksChainId.rinkeby]: [collectibleA2],
        },
      },
    });
  });

  it('should remove favorite collectible', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: { [NetworksChainId.mainnet]: [collectibleA1] },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: { [selectedAddressA]: { [NetworksChainId.mainnet]: [] } },
    });
  });

  it('should remove favorite collectible by address', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: {
          [NetworksChainId.mainnet]: [collectibleB1, collectibleB2],
        },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: NetworksChainId.mainnet,
      collectible: collectibleB1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: { [NetworksChainId.mainnet]: [collectibleB2] },
      },
    });
  });

  it('should remove favorite collectible by chainId', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1, collectibleA2],
          [NetworksChainId.rinkeby]: [collectibleA1],
        },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: NetworksChainId.rinkeby,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [NetworksChainId.mainnet]: [collectibleA1, collectibleA2],
          [NetworksChainId.rinkeby]: [],
        },
      },
    });
  });
});
