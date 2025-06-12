import { renderHook, act } from '@testing-library/react-hooks';
import useSamplePetNamesForm from './useSamplePetNamesForm';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { toChecksumAddress } from 'ethereumjs-util';

// Mock the Engine and AddressBookController
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AddressBookController: {
        set: jest.fn(),
      },
    },
  },
}));

describe('useSamplePetNamesForm', () => {
  const initialAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const initialName = 'My Pet Name';
  const chainId: Hex = '0x1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads initial values', () => {
    const { result } = renderHook(() =>
        useSamplePetNamesForm(chainId, initialAddress, initialName)
    );

    expect(result.current.address).toBe(initialAddress);
    expect(result.current.name).toBe(initialName);
    expect(result.current.isValid).toBe(true);
  });

  it('updates address and name', () => {
    const { result } = renderHook(() =>
        useSamplePetNamesForm(chainId, initialAddress, initialName)
    );

    act(() => {
      result.current.setAddress('0xabc');
      result.current.setName('New Name');
    });

    expect(result.current.address).toBe('0xabc');
    expect(result.current.name).toBe('New Name');
    expect(result.current.isValid).toBe(true);
  });

  it('resets to initial values', () => {
    const { result } = renderHook(() =>
        useSamplePetNamesForm(chainId, initialAddress, initialName)
    );

    act(() => {
      result.current.setAddress('0xabc');
      result.current.setName('New Name');
      result.current.reset();
    });

    expect(result.current.address).toBe(initialAddress);
    expect(result.current.name).toBe(initialName);
  });

  it('does not store invalid values', () => {
    const { result } = renderHook(() =>
        useSamplePetNamesForm(chainId, '', '')
    );

    act(() => {
      result.current.onSubmit();
    });

    expect(Engine.context.AddressBookController.set).not.toHaveBeenCalled();
  });

  it('stores valid values ', () => {
    const { result } = renderHook(() =>
        useSamplePetNamesForm(chainId, initialAddress, initialName)
    );

    act(() => {
      result.current.onSubmit();
    });

    expect(Engine.context.AddressBookController.set).toHaveBeenCalledWith(
        toChecksumAddress(initialAddress),
        initialName,
        chainId
    );
  });
});
