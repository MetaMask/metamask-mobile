import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { useUserRegistrationStatus } from './useUserRegistrationStatus';
import { CardSDK } from '../sdk/CardSDK';
import { UserResponse, CardVerificationState } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../util/getErrorMessage', () => ({
  getErrorMessage: jest.fn(),
}));

let mockQueryConfig: {
  enabled?: boolean;
  refetchInterval?: unknown;
} = {};

const mockUseQueryReturn: {
  data: UserResponse | undefined;
  isLoading: boolean;
  error: Error | null;
} = {
  data: undefined,
  isLoading: false,
  error: null,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation((config) => {
    mockQueryConfig = config;
    return mockUseQueryReturn;
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<
  typeof getErrorMessage
>;

describe('useUserRegistrationStatus', () => {
  const mockGetRegistrationStatus = jest.fn();
  const mockSetUser = jest.fn();

  const mockSDK = {
    getRegistrationStatus: mockGetRegistrationStatus,
  } as unknown as CardSDK;

  const mockUserResponse: UserResponse = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    verificationState: 'VERIFIED' as CardVerificationState,
    phoneNumber: '1234567890',
    phoneCountryCode: '+1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue('onboarding-123');

    mockGetRegistrationStatus.mockResolvedValue({
      ...mockUserResponse,
      verificationState: 'PENDING',
    });

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      user: null,
      setUser: mockSetUser,
      isLoading: false,
      logoutFromProvider: jest.fn(),
      fetchUserData: jest.fn(),
      isReturningSession: false,
    });
    mockGetErrorMessage.mockReturnValue('Mocked error message');

    mockUseQueryReturn.data = undefined;
    mockUseQueryReturn.isLoading = false;
    mockUseQueryReturn.error = null;
    mockQueryConfig = {};
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.startPolling).toBe('function');
      expect(typeof result.current.stopPolling).toBe('function');
    });
  });

  describe('useQuery configuration', () => {
    it('passes correct query key with onboardingId', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      renderHook(() => useUserRegistrationStatus());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['card', 'registrationStatus', 'onboarding-123'],
        }),
      );
    });

    it('disables query initially (polling not started)', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      renderHook(() => useUserRegistrationStatus());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });

    it('enables query when startPolling is called', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.startPolling();
      });

      const lastCallConfig =
        mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
      expect(lastCallConfig.enabled).toBe(true);
    });

    it('disables query when stopPolling is called', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.startPolling();
      });

      act(() => {
        result.current.stopPolling();
      });

      const lastCallConfig =
        mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
      expect(lastCallConfig.enabled).toBe(false);
    });

    it('provides refetchInterval function', () => {
      renderHook(() => useUserRegistrationStatus());

      expect(mockQueryConfig.refetchInterval).toBeDefined();
      expect(typeof mockQueryConfig.refetchInterval).toBe('function');
    });

    it('refetchInterval returns 5000 when state is PENDING', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      const result = refetchIntervalFn({
        state: { data: { verificationState: 'PENDING' } },
      });

      expect(result).toBe(5000);
    });

    it('refetchInterval returns false when state is VERIFIED', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      const result = refetchIntervalFn({
        state: { data: { verificationState: 'VERIFIED' } },
      });

      expect(result).toBe(false);
    });

    it('refetchInterval returns false when state is REJECTED', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      const result = refetchIntervalFn({
        state: { data: { verificationState: 'REJECTED' } },
      });

      expect(result).toBe(false);
    });

    it('refetchInterval returns 5000 when data is undefined', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: undefined };
      }) => number | false;

      const result = refetchIntervalFn({
        state: { data: undefined },
      });

      expect(result).toBe(5000);
    });
  });

  describe('verification state resolution', () => {
    it('returns data verificationState when available', () => {
      mockUseQueryReturn.data = {
        ...mockUserResponse,
        verificationState: 'VERIFIED',
      };

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('VERIFIED');
    });

    it('falls back to user verificationState from SDK context', () => {
      mockUseQueryReturn.data = undefined;
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
        user: { ...mockUserResponse, verificationState: 'UNVERIFIED' },
        setUser: mockSetUser,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('UNVERIFIED');
    });

    it('defaults to PENDING when no data and no user', () => {
      mockUseQueryReturn.data = undefined;
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
        user: null,
        setUser: mockSetUser,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('PENDING');
    });
  });

  describe('Auto-stop polling based on verification state', () => {
    it('refetchInterval stops polling when state is VERIFIED', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      expect(
        refetchIntervalFn({
          state: { data: { verificationState: 'VERIFIED' } },
        }),
      ).toBe(false);
    });

    it('refetchInterval stops polling when state is UNVERIFIED', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      expect(
        refetchIntervalFn({
          state: { data: { verificationState: 'UNVERIFIED' } },
        }),
      ).toBe(false);
    });

    it('refetchInterval stops polling when state is REJECTED', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      expect(
        refetchIntervalFn({
          state: { data: { verificationState: 'REJECTED' } },
        }),
      ).toBe(false);
    });

    it('refetchInterval continues polling when state is PENDING', () => {
      renderHook(() => useUserRegistrationStatus());

      const refetchIntervalFn = mockQueryConfig.refetchInterval as (query: {
        state: { data: { verificationState: string } | undefined };
      }) => number | false;

      expect(
        refetchIntervalFn({
          state: { data: { verificationState: 'PENDING' } },
        }),
      ).toBe(5000);
    });
  });

  describe('error handling', () => {
    it('returns error state when query has error', () => {
      const queryError = new Error('Server error');
      mockUseQueryReturn.error = queryError;
      mockGetErrorMessage.mockReturnValue('Server error occurred');

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Server error occurred');
    });

    it('returns no error state when query has no error', () => {
      mockUseQueryReturn.error = null;

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Polling Management', () => {
    it('starts polling via startPolling', () => {
      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');
    });

    it('stops polling via stopPolling', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.startPolling();
      });

      act(() => {
        result.current.stopPolling();
      });

      const lastCallConfig =
        mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
      expect(lastCallConfig.enabled).toBe(false);
    });

    it('handles stopPolling when no polling is active', () => {
      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isError).toBe(false);
    });

    it('handles multiple rapid startPolling calls', () => {
      const { result } = renderHook(() => useUserRegistrationStatus());

      act(() => {
        result.current.startPolling();
      });

      act(() => {
        result.current.startPolling();
      });

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles response without verificationState', () => {
      mockUseQueryReturn.data = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      } as UserResponse;

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isError).toBe(false);
    });

    it('handles SDK not available', () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        user: null,
        setUser: mockSetUser,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { result } = renderHook(() => useUserRegistrationStatus());

      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setUser effect', () => {
    it('calls setUser when data is available', () => {
      mockUseQueryReturn.data = mockUserResponse;

      renderHook(() => useUserRegistrationStatus());

      expect(mockSetUser).toHaveBeenCalledWith(mockUserResponse);
    });

    it('does not call setUser when data is undefined', () => {
      mockUseQueryReturn.data = undefined;

      renderHook(() => useUserRegistrationStatus());

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });
});
