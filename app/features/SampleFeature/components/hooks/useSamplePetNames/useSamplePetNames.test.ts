jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SamplePetnamesController: {
        state: {
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
  },
}));

import { useSamplePetNames } from './useSamplePetNames';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { RootState } from 'app/reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider.tsx';

const MOCK_CHAIN_ID: Hex = '0x1';

const renderHook = (chainId: Hex) => {
  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        SamplePetnamesController: {
          namesByChainIdAndAddress:
            Engine.context.SamplePetnamesController.state
              .namesByChainIdAndAddress,
        },
      },
    },
  };

  return renderHookWithProvider(() => useSamplePetNames(chainId), {
    state: mockState,
  });
};

describe('useSamplePetNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pet names for the specified chain', () => {
    // Given a chain with pet names
    // When the hook is called with that chain ID
    const { result } = renderHook(MOCK_CHAIN_ID);
    
    // Then it should return the pet names for that chain
    expect(result.current.petNames).toEqual([
      { address: '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05', name: 'Alice' },
      { address: '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44', name: 'Bob' },
    ]);
  });

  it('returns an empty array when no pet names exist for the chain', () => {
    // Given a chain without pet names
    // When the hook is called with that chain ID
    const { result } = renderHook('0x999' as Hex);
    
    // Then it should return an empty array
    expect(result.current.petNames).toEqual([]);
  });

  it('returns pet names for Polygon chain', () => {
    // Given the Polygon chain with pet names
    // When the hook is called with Polygon chain ID
    const { result } = renderHook('0x89' as Hex);
    
    // Then it should return the pet names for Polygon
    expect(result.current.petNames).toEqual([
      { address: '0xA8c23800fe9942e9aBd6F3669018934598777eC1', name: 'Charlie' },
    ]);
  });
});
