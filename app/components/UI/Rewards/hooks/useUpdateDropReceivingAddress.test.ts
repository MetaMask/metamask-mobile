import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useUpdateDropReceivingAddress } from './useUpdateDropReceivingAddress';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';
import {
  setRecentDropAddressCommit,
  setIsUpdatingDropAddress,
} from '../../../../reducers/rewards';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setRecentDropAddressCommit: jest.fn(),
  setIsUpdatingDropAddress: jest.fn(),
}));

describe('useUpdateDropReceivingAddress', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;
  const mockDispatch = jest.fn();

  const mockSubscriptionId = 'sub-123';
  const mockDropId = 'drop-456';
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.updateError).toBeNull();
      expect(typeof result.current.updateDropReceivingAddress).toBe('function');
      expect(typeof result.current.clearUpdateError).toBe('function');
    });
  });

  describe('updateDropReceivingAddress function', () => {
    it('should successfully update receiving address', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateDropReceivingAddress(
          mockDropId,
          mockAddress,
        );
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:updateDropReceivingAddress',
        mockDropId,
        mockAddress,
        mockSubscriptionId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(setIsUpdatingDropAddress(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        setRecentDropAddressCommit({
          dropId: mockDropId,
          address: mockAddress,
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setIsUpdatingDropAddress(false),
      );
      expect(updateResult).toBe(true);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.updateError).toBeNull();
    });

    it('should set loading state during update process', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      act(() => {
        result.current.updateDropReceivingAddress(mockDropId, mockAddress);
      });

      expect(result.current.isUpdating).toBe(true);
      expect(result.current.updateError).toBeNull();

      await act(async () => {
        resolvePromise();
        await promise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateDropReceivingAddress(
          mockDropId,
          mockAddress,
        );
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.updateError).toBe(
        'No subscription found. Please try again.',
      );
      expect(updateResult).toBe(false);
      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle missing dropId', async () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateDropReceivingAddress(
          '',
          mockAddress,
        );
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.updateError).toBe('Drop ID is required.');
      expect(updateResult).toBe(false);
    });

    it('should handle missing address', async () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateDropReceivingAddress(
          mockDropId,
          '',
        );
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.updateError).toBe('Address is required.');
      expect(updateResult).toBe(false);
    });

    it('should handle update error', async () => {
      const mockError = new Error('Update failed');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Failed to update address');

      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateDropReceivingAddress(
          mockDropId,
          mockAddress,
        );
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.updateError).toBe('Failed to update address');
      expect(updateResult).toBe(false);
      expect(result.current.isUpdating).toBe(false);
    });

    it('should clear error before new update attempt', async () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      // First, trigger an error
      await act(async () => {
        await result.current.updateDropReceivingAddress(mockDropId, '');
      });

      expect(result.current.updateError).toBe('Address is required.');

      // Now make a successful update
      mockEngineCall.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.updateDropReceivingAddress(
          mockDropId,
          mockAddress,
        );
      });

      expect(result.current.updateError).toBeNull();
    });
  });

  describe('clearUpdateError function', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      // First, set an error
      await act(async () => {
        await result.current.updateDropReceivingAddress('', mockAddress);
      });

      expect(result.current.updateError).toBe('Drop ID is required.');

      // Clear the error
      act(() => {
        result.current.clearUpdateError();
      });

      expect(result.current.updateError).toBeNull();
    });

    it('should not affect other state when clearing error', () => {
      const { result } = renderHook(() => useUpdateDropReceivingAddress());

      act(() => {
        result.current.clearUpdateError();
      });

      expect(result.current.updateError).toBeNull();
      expect(result.current.isUpdating).toBe(false);
      expect(typeof result.current.updateDropReceivingAddress).toBe('function');
    });
  });
});
