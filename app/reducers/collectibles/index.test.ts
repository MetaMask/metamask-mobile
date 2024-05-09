import { ChainId } from '@metamask/controller-utils';
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

describe('collectibles reducer', () => {
  it('should add favorite', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(firstState).toEqual({
      favorites: {
        [selectedAddressA]: { [ChainId.mainnet]: [collectibleA1] },
      },
    });
  });

  it('should add favorite by selectedAddress', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: ChainId.mainnet,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1],
        },
        [selectedAddressB]: {
          [ChainId.mainnet]: [collectibleA2],
        },
      },
    });
  });

  it('should add favorite by chainId', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.sepolia,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1],
          [ChainId.sepolia]: [collectibleA2],
        },
      },
    });
  });

  it('should remove favorite collectible', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: { [ChainId.mainnet]: [collectibleA1] },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: { [selectedAddressA]: { [ChainId.mainnet]: [] } },
    });
  });

  it('should remove favorite collectible by address', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: {
          [ChainId.mainnet]: [collectibleB1, collectibleB2],
        },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: ChainId.mainnet,
      collectible: collectibleB1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: { [ChainId.mainnet]: [collectibleB2] },
      },
    });
  });

  it('should remove favorite collectible by chainId', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
          [ChainId.sepolia]: [collectibleA1],
        },
      },
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.sepolia,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
          [ChainId.sepolia]: [],
        },
      },
    });
  });
});
