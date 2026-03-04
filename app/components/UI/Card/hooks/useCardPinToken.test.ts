import { renderHook, act } from '@testing-library/react-hooks';
import { useMutation } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import useCardPinToken from './useCardPinToken';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../util/theme', () => ({
  useTheme: (...args: unknown[]) => mockUseTheme(...args),
}));

jest.mock('../queries', () => ({
  cardQueries: {
    pin: {
      keys: { token: () => ['card', 'pin', 'token'] },
      tokenMutationFn: jest.fn(() => jest.fn()),
    },
  },
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useCardPinToken', () => {
  const mockMutateAsync = jest.fn();
  const mockReset = jest.fn();

  const mockTokenResponse = {
    token: 'pin-token-123',
    imageUrl: 'https://cards.baanx.com/details-image?token=pin-token-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTheme.mockReturnValue({ themeAppearance: 'light' });

    mockUseCardSDK.mockReturnValue({
      sdk: {} as never,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
      fetchUserData: jest.fn(),
      isReturningSession: false,
    });

    mockMutateAsync.mockResolvedValue(mockTokenResponse);

    (useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      data: null,
      reset: mockReset,
    });
  });

  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useCardPinToken());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.imageUrl).toBeNull();
      expect(typeof result.current.generatePinToken).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('generatePinToken', () => {
    it('calls mutateAsync with light theme CSS', async () => {
      const { result } = renderHook(() => useCardPinToken());

      await act(async () => {
        await result.current.generatePinToken();
      });

      expect(mockMutateAsync).toHaveBeenCalledWith({
        customCss: { backgroundColor: '#FFF', textColor: '#000' },
      });
    });

    it('returns the mutation response', async () => {
      const { result } = renderHook(() => useCardPinToken());

      let response;
      await act(async () => {
        response = await result.current.generatePinToken();
      });

      expect(response).toEqual(mockTokenResponse);
    });
  });

  describe('Loading State', () => {
    it('reflects isPending from mutation', () => {
      (useMutation as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        error: null,
        data: null,
        reset: mockReset,
      });

      const { result } = renderHook(() => useCardPinToken());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('reflects error from mutation', () => {
      const testError = new Error('Network error');
      (useMutation as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: testError,
        data: null,
        reset: mockReset,
      });

      const { result } = renderHook(() => useCardPinToken());

      expect(result.current.error).toBe(testError);
    });
  });

  describe('imageUrl', () => {
    it('returns imageUrl from successful mutation data', () => {
      (useMutation as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
        data: mockTokenResponse,
        reset: mockReset,
      });

      const { result } = renderHook(() => useCardPinToken());

      expect(result.current.imageUrl).toBe(mockTokenResponse.imageUrl);
    });

    it('returns null when no data', () => {
      const { result } = renderHook(() => useCardPinToken());

      expect(result.current.imageUrl).toBeNull();
    });
  });

  describe('reset', () => {
    it('delegates to mutation reset', () => {
      const { result } = renderHook(() => useCardPinToken());

      act(() => {
        result.current.reset();
      });

      expect(mockReset).toHaveBeenCalled();
    });
  });
});
