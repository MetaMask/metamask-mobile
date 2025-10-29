import { RootState } from '../../../../reducers';
import {
  selectSamplePetnamesControllerState,
  selectSamplePetnamesByChainIdAndAddress,
  selectSamplePetnamesByChainId,
  selectSamplePetnameByChainIdAndAddress,
} from './index';
import { Hex } from '@metamask/utils';

describe('SamplePetnamesController Selectors', () => {
  // Arrange: Setup mock states
  const mockStateWithPetnames = {
    engine: {
      backgroundState: {
        SamplePetnamesController: {
          namesByChainIdAndAddress: {
            '0x1': {
              '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05': 'Alice',
              '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44': 'Bob',
            },
            '0x89': {
              '0xA8c23800fe9942e9aBd6F3669018934598777eC1': 'Charlie',
            },
          },
        },
      },
    },
  } as unknown as RootState;

  const mockStateWithoutController = {
    engine: {
      backgroundState: {},
    },
  } as unknown as RootState;

  describe('selectSamplePetnamesControllerState', () => {
    it('returns controller state when it exists', () => {
      // Given a state with sample petnames controller data
      // When selecting the controller state
      const result = selectSamplePetnamesControllerState(mockStateWithPetnames);

      // Then it should return the complete controller state
      expect(result).toEqual({
        namesByChainIdAndAddress: {
          '0x1': {
            '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05': 'Alice',
            '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44': 'Bob',
          },
          '0x89': {
            '0xA8c23800fe9942e9aBd6F3669018934598777eC1': 'Charlie',
          },
        },
      });
    });

    it('returns undefined when controller is not initialized', () => {
      // Given a state without sample petnames controller
      // When selecting the controller state
      const result = selectSamplePetnamesControllerState(
        mockStateWithoutController,
      );

      // Then it should return undefined
      expect(result).toBeUndefined();
    });
  });

  describe('selectSamplePetnamesByChainIdAndAddress', () => {
    it('returns all petnames organized by chain and address', () => {
      // Given a state with petnames across multiple chains
      // When selecting all petnames by chain ID and address
      const result = selectSamplePetnamesByChainIdAndAddress(
        mockStateWithPetnames,
      );

      // Then it should return the complete mapping
      expect(result).toEqual({
        '0x1': {
          '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05': 'Alice',
          '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44': 'Bob',
        },
        '0x89': {
          '0xA8c23800fe9942e9aBd6F3669018934598777eC1': 'Charlie',
        },
      });
    });

    it('returns empty object when controller has no data', () => {
      // Given a state without controller initialization
      // When selecting all petnames
      const result = selectSamplePetnamesByChainIdAndAddress(
        mockStateWithoutController,
      );

      // Then it should return an empty object as fallback
      expect(result).toEqual({});
    });
  });

  describe('selectSamplePetnamesByChainId', () => {
    it('returns petnames for Ethereum mainnet chain', () => {
      // Given a state with petnames on multiple chains
      // When selecting petnames for Ethereum mainnet (0x1)
      const result = selectSamplePetnamesByChainId(
        mockStateWithPetnames,
        '0x1' as Hex,
      );

      // Then it should return only petnames for that chain
      expect(result).toEqual({
        '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05': 'Alice',
        '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44': 'Bob',
      });
    });

    it('returns petnames for Polygon chain', () => {
      // Given a state with petnames on multiple chains
      // When selecting petnames for Polygon (0x89)
      const result = selectSamplePetnamesByChainId(
        mockStateWithPetnames,
        '0x89' as Hex,
      );

      // Then it should return only petnames for that chain
      expect(result).toEqual({
        '0xA8c23800fe9942e9aBd6F3669018934598777eC1': 'Charlie',
      });
    });

    it('returns empty object for chain without petnames', () => {
      // Given a state with petnames on some chains
      // When selecting petnames for a chain without any entries
      const result = selectSamplePetnamesByChainId(
        mockStateWithPetnames,
        '0x999' as Hex,
      );

      // Then it should return an empty object
      expect(result).toEqual({});
    });

    it('returns empty object when controller is not initialized', () => {
      // Given a state without controller
      // When selecting petnames for any chain
      const result = selectSamplePetnamesByChainId(
        mockStateWithoutController,
        '0x1' as Hex,
      );

      // Then it should return an empty object
      expect(result).toEqual({});
    });
  });

  describe('selectSamplePetnameByChainIdAndAddress', () => {
    it('returns petname for existing address on Ethereum mainnet', () => {
      // Given a state with Alice's petname on Ethereum mainnet
      // When selecting the petname for Alice's address
      const result = selectSamplePetnameByChainIdAndAddress(
        mockStateWithPetnames,
        '0x1' as Hex,
        '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05' as Hex,
      );

      // Then it should return 'Alice'
      expect(result).toBe('Alice');
    });

    it('returns undefined for address without petname', () => {
      // Given a state with some petnames
      // When selecting a petname for an address without entry
      const result = selectSamplePetnameByChainIdAndAddress(
        mockStateWithPetnames,
        '0x1' as Hex,
        '0xA12702acfB0402c7dE24AD1B99eD8FaC7E71Ff9C' as Hex,
      );

      // Then it should return undefined
      expect(result).toBeUndefined();
    });

    it('returns undefined when querying wrong chain for existing address', () => {
      // Given Alice has a petname on Ethereum mainnet
      // When querying for Alice's petname on a different chain
      const result = selectSamplePetnameByChainIdAndAddress(
        mockStateWithPetnames,
        '0x999' as Hex,
        '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05' as Hex,
      );

      // Then it should return undefined (petname is chain-specific)
      expect(result).toBeUndefined();
    });

    it('returns undefined when controller is not initialized', () => {
      // Given a state without controller
      // When selecting any petname
      const result = selectSamplePetnameByChainIdAndAddress(
        mockStateWithoutController,
        '0x1' as Hex,
        '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05' as Hex,
      );

      // Then it should return undefined
      expect(result).toBeUndefined();
    });
  });
});
