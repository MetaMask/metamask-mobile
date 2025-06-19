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
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    },
  }));

import { act, waitFor } from '@testing-library/react-native';
import { useSamplePetNames } from './useSamplePetNames';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { RootState } from 'app/reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { DeepPartial, renderHookWithProvider } from '../../../../../util/test/renderWithProvider.tsx';

const MOCK_CHAIN_ID: Hex = '0x1';

const renderHook = (chainId: Hex) => {
  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        SamplePetnamesController: {
          namesByChainIdAndAddress:
            Engine.context.SamplePetnamesController.state.namesByChainIdAndAddress,
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
    const { result } = renderHook(MOCK_CHAIN_ID);
    expect(result.current.petNames).toEqual([
      { address: '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05', name: 'Alice' },
      { address: '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44', name: 'Bob' },
    ]);
  });

  it('returns an empty array when no pet names exist for the chain', () => {
    const { result } = renderHook('0x999' as Hex);
    expect(result.current.petNames).toEqual([]);
  });

  it('subscribes to controller state changes on mount', () => {
    renderHook(MOCK_CHAIN_ID);
    expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
      'SamplePetnamesController:stateChange',
      expect.any(Function),
    );
  });

  it('unsubscribes from controller state changes on unmount', () => {
    const { unmount } = renderHook(MOCK_CHAIN_ID);
    unmount();
    expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
      'SamplePetnamesController:stateChange',
      expect.any(Function),
    );
  });

  it('updates pet names when controller state changes', async () => {
    let stateChangeCb: () => void = () => {};
    (Engine.controllerMessenger.subscribe as jest.Mock).mockImplementation((_event, cb) => {
      stateChangeCb = cb;
    });

    const { result } = renderHook(MOCK_CHAIN_ID);

    // Simulate adding a new pet name
    Engine.context.SamplePetnamesController.state.namesByChainIdAndAddress['0x1'][
      '0xA12702acfB0402c7dE24AD1B99eD8FaC7E71Ff9C'
    ] = 'New Pet';

    act(() => {
      stateChangeCb();
    });

    await waitFor(() => {
      expect(result.current.petNames).toEqual([
        { address: '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05', name: 'Alice' },
        { address: '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44', name: 'Bob' },
        { address: '0xA12702acfB0402c7dE24AD1B99eD8FaC7E71Ff9C', name: 'New Pet' },
      ]);
    });
  });

  it('resubscribes when chainId changes', () => {
    // Test with first chainId
    const { unmount: unmountFirst } = renderHook('0x1' as Hex);

    // Verify subscription was called
    expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledTimes(1);

    // Unmount and test with different chainId
    unmountFirst();
    expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledTimes(1);

    // Test with second chainId
    const { unmount: unmountSecond } = renderHook('0x89' as Hex);

    // Verify subscription was called again
    expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledTimes(2);

    unmountSecond();
    expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledTimes(2);
  });
});
