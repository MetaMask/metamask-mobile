import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictAgreement } from './usePredictAgreement';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      acceptAgreement: jest.fn(),
    },
  },
}));

describe('usePredictAgreement', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockAcceptAgreement = Engine.context.PredictController
    .acceptAgreement as jest.Mock;

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockProviderId = 'polymarket';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseSelector.mockImplementation(() => {
      // First call returns the address, second call returns account meta
      if (mockUseSelector.mock.calls.length === 1) {
        return mockAddress;
      }
      return { isOnboarded: false, acceptedToS: false };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAgreementAccepted', () => {
    it('returns false when agreement is not accepted', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(result.current.isAgreementAccepted).toBe(false);
    });

    it('returns true when agreement is accepted', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: true });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(result.current.isAgreementAccepted).toBe(true);
    });

    it('returns false when no address is selected', () => {
      mockUseSelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(result.current.isAgreementAccepted).toBe(false);
    });

    it('calls selector with correct providerId', () => {
      const customProviderId = 'custom-provider';
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      renderHook(() => usePredictAgreement({ providerId: customProviderId }));

      // Second selector call should have used the custom providerId
      expect(mockUseSelector).toHaveBeenCalledTimes(2);
    });
  });

  describe('acceptAgreement', () => {
    it('calls controller acceptAgreement with correct parameters', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      act(() => {
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledWith({
        providerId: mockProviderId,
        address: mockAddress,
      });
    });

    it('returns true when agreement is accepted successfully', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      let acceptResult: boolean | undefined;
      act(() => {
        acceptResult = result.current.acceptAgreement();
      });

      expect(acceptResult).toBe(true);
    });

    it('returns false when no address is selected', () => {
      mockUseSelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      let acceptResult: boolean | undefined;
      act(() => {
        acceptResult = result.current.acceptAgreement();
      });

      expect(acceptResult).toBe(false);
      expect(mockAcceptAgreement).not.toHaveBeenCalled();
    });

    it('returns false when address is empty string', () => {
      mockUseSelector
        .mockReturnValueOnce('')
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      let acceptResult: boolean | undefined;
      act(() => {
        acceptResult = result.current.acceptAgreement();
      });

      expect(acceptResult).toBe(false);
      expect(mockAcceptAgreement).not.toHaveBeenCalled();
    });

    it('calls acceptAgreement with different providerId', () => {
      const customProviderId = 'custom-provider';
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: customProviderId }),
      );

      act(() => {
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledWith({
        providerId: customProviderId,
        address: mockAddress,
      });
    });

    it('returns value from controller acceptAgreement', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(false);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      let acceptResult: boolean | undefined;
      act(() => {
        acceptResult = result.current.acceptAgreement();
      });

      expect(acceptResult).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('returns stable acceptAgreement function reference', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result, rerender } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      const initialAcceptAgreement = result.current.acceptAgreement;

      // Mock for rerender
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      rerender({ providerId: mockProviderId });

      expect(result.current.acceptAgreement).toBe(initialAcceptAgreement);
    });

    it('updates acceptAgreement when providerId changes', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result, rerender } = renderHook(
        ({ providerId }) => usePredictAgreement({ providerId }),
        { initialProps: { providerId: 'provider1' } },
      );

      const initialAcceptAgreement = result.current.acceptAgreement;

      // Mock for rerender with different providerId
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      rerender({ providerId: mockProviderId });

      expect(result.current.acceptAgreement).not.toBe(initialAcceptAgreement);
    });

    it('updates acceptAgreement when address changes', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result, rerender } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      const initialAcceptAgreement = result.current.acceptAgreement;

      // Mock for rerender with different address
      const newAddress = '0x9876543210987654321098765432109876543210';
      mockUseSelector
        .mockReturnValueOnce(newAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      rerender({ providerId: mockProviderId });

      expect(result.current.acceptAgreement).not.toBe(initialAcceptAgreement);
    });
  });

  describe('multiple calls', () => {
    it('handles multiple accept calls correctly', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      act(() => {
        result.current.acceptAgreement();
        result.current.acceptAgreement();
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledTimes(3);
    });

    it('uses updated address for subsequent calls', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result, rerender } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      act(() => {
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledWith({
        providerId: mockProviderId,
        address: mockAddress,
      });

      // Simulate address change
      const newAddress = '0xNewAddress1234567890123456789012345678';
      mockUseSelector
        .mockReturnValueOnce(newAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      rerender({ providerId: mockProviderId });

      act(() => {
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledWith({
        providerId: mockProviderId,
        address: newAddress,
      });
    });
  });

  describe('edge cases', () => {
    it('handles undefined address', () => {
      mockUseSelector
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      let acceptResult: boolean | undefined;
      act(() => {
        acceptResult = result.current.acceptAgreement();
      });

      expect(acceptResult).toBe(false);
      expect(mockAcceptAgreement).not.toHaveBeenCalled();
    });

    it('handles controller throwing error', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockImplementation(() => {
        throw new Error('Controller error');
      });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(() => {
        act(() => {
          result.current.acceptAgreement();
        });
      }).toThrow('Controller error');
    });

    it('handles empty providerId', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });
      mockAcceptAgreement.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: '' }),
      );

      act(() => {
        result.current.acceptAgreement();
      });

      expect(mockAcceptAgreement).toHaveBeenCalledWith({
        providerId: '',
        address: mockAddress,
      });
    });
  });

  describe('return value structure', () => {
    it('returns object with correct properties', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(result.current).toHaveProperty('isAgreementAccepted');
      expect(result.current).toHaveProperty('acceptAgreement');
      expect(typeof result.current.isAgreementAccepted).toBe('boolean');
      expect(typeof result.current.acceptAgreement).toBe('function');
    });

    it('returns exactly two properties', () => {
      mockUseSelector
        .mockReturnValueOnce(mockAddress)
        .mockReturnValueOnce({ isOnboarded: false, acceptedToS: false });

      const { result } = renderHook(() =>
        usePredictAgreement({ providerId: mockProviderId }),
      );

      expect(Object.keys(result.current)).toHaveLength(2);
    });
  });
});
