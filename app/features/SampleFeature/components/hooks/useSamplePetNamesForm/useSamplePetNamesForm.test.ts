import { renderHook, act } from '@testing-library/react-hooks';
import useSamplePetNamesForm from './useSamplePetNamesForm';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { toChecksumAddress } from 'ethereumjs-util';

// Mock the trace utility
jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    SampleFeatureAddPetName: 'Sample Feature Add Pet Name',
  },
  TraceOperation: {
    SampleFeatureAddPetName: 'sample.feature.add.pet.name',
  },
}));

// Mock the Engine and SamplePetnamesController
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SamplePetnamesController: {
        assignPetname: jest.fn(),
      },
    },
  },
}));

import { trace } from '../../../../../util/trace';

const mockAssignPetname = Engine.context.SamplePetnamesController
  .assignPetname as jest.Mock;

describe('useSamplePetNamesForm', () => {
  const chainId: Hex = '0x1';
  const initialAddress = '0xc6893a7d6a966535F7884A4de710111986ebB132';
  const initialName = 'Test Account';
  const mockTrace = trace as jest.MockedFunction<typeof trace>;

  beforeEach(() => {
    mockAssignPetname.mockClear();
    jest.clearAllMocks();
    // Mock trace to execute the callback
    mockTrace.mockImplementation(
      <T>(_request: unknown, callback?: () => T): T | undefined => {
        if (callback) {
          return callback();
        }
        return undefined as T | undefined;
      },
    );
  });

  it('initializes with provided address and name', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );

    expect(result.current.address).toBe(initialAddress);
    expect(result.current.name).toBe(initialName);
    expect(result.current.isValid).toBe(true);
  });

  it('updates address when setAddress is called', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );
    const newAddress = '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05';

    act(() => {
      result.current.setAddress(newAddress);
    });

    expect(result.current.address).toBe(newAddress);
  });

  it('updates name when setName is called', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );
    const newName = 'New Name';

    act(() => {
      result.current.setName(newName);
    });

    expect(result.current.name).toBe(newName);
  });

  it.each([
    ['empty address', '', 'Test Name'],
    ['empty name', '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44', ''],
    ['both empty', '', ''],
  ])('is invalid when %s', (_, address, name) => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, address, name),
    );

    expect(result.current.isValid).toBe(false);
  });

  it('is valid when both address and name are provided', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );

    expect(result.current.isValid).toBe(true);
  });

  it('calls SamplePetnamesController.assignPetname with correct parameters when form is submitted', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );

    act(() => {
      result.current.onSubmit();
    });

    expect(mockAssignPetname).toHaveBeenCalledWith(
      chainId,
      toChecksumAddress(initialAddress),
      initialName,
    );
  });

  it('calls trace with correct parameters when form is submitted', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );

    act(() => {
      result.current.onSubmit();
    });

    expect(mockTrace).toHaveBeenCalledWith(
      {
        name: 'Sample Feature Add Pet Name',
        op: 'sample.feature.add.pet.name',
        data: {
          feature: 'sample-pet-names',
          operation: 'add-pet-name',
          chainId: '0x1',
        },
        tags: {
          environment: 'development',
          component: 'useSamplePetNamesForm',
        },
      },
      expect.any(Function),
    );
  });

  it('does not call assignPetname when form is invalid', () => {
    const { result } = renderHook(() => useSamplePetNamesForm(chainId, '', ''));

    act(() => {
      result.current.onSubmit();
    });

    expect(mockAssignPetname).not.toHaveBeenCalled();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('resets form to initial values when reset is called', () => {
    const { result } = renderHook(() =>
      useSamplePetNamesForm(chainId, initialAddress, initialName),
    );

    act(() => {
      result.current.setAddress('0xA12702acfB0402c7dE24AD1B99eD8FaC7E71Ff9C');
      result.current.setName('New Name');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.address).toBe(initialAddress);
    expect(result.current.name).toBe(initialName);
  });

  it('updates form when initial values change', () => {
    const { result, rerender } = renderHook(
      ({
        chainId: testChainId,
        initialAddress: testInitialAddress,
        initialName: testInitialName,
      }) =>
        useSamplePetNamesForm(testChainId, testInitialAddress, testInitialName),
      {
        initialProps: { chainId, initialAddress, initialName },
      },
    );

    const newAddress = '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05';
    const newName = 'Updated Name';
    rerender({ chainId, initialAddress: newAddress, initialName: newName });

    expect(result.current.address).toBe(newAddress);
    expect(result.current.name).toBe(newName);
  });
});
