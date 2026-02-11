import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import useCardDetailsToken from './useCardDetailsToken';
import { CardType, CardDetailsTokenResponse } from '../types';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useCardDetailsToken', () => {
  const mockGenerateCardDetailsToken = jest.fn();

  const mockSDK = {
    generateCardDetailsToken: mockGenerateCardDetailsToken,
  } as unknown as CardSDK;

  const mockTokenResponse: CardDetailsTokenResponse = {
    token: 'test-token-123',
    imageUrl: 'https://cards.baanx.com/details-image?token=test-token-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks - authenticated user with loaded SDK
    mockUseSelector.mockReturnValue(true); // isAuthenticated

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
      fetchUserData: jest.fn(),
      isReturningSession: false,
    });

    mockGenerateCardDetailsToken.mockResolvedValue(mockTokenResponse);
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetailsToken());

      // Then: Initial state should have null values and not be loading
      expect(result.current.imageUrl).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isImageLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.fetchCardDetailsToken).toBe('function');
      expect(typeof result.current.clearImageUrl).toBe('function');
      expect(typeof result.current.onImageLoad).toBe('function');
    });
  });

  describe('fetchCardDetailsToken', () => {
    it('returns null when user is not authenticated', async () => {
      // Given: User is not authenticated
      mockUseSelector.mockReturnValue(false);

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called
      let response: CardDetailsTokenResponse | null = null;
      await act(async () => {
        response = await result.current.fetchCardDetailsToken();
      });

      // Then: Returns null and doesn't call SDK
      expect(response).toBeNull();
      expect(mockGenerateCardDetailsToken).not.toHaveBeenCalled();
    });

    it('returns null when SDK is not available', async () => {
      // Given: No SDK available
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called
      let response: CardDetailsTokenResponse | null = null;
      await act(async () => {
        response = await result.current.fetchCardDetailsToken();
      });

      // Then: Returns null and doesn't call SDK
      expect(response).toBeNull();
      expect(mockGenerateCardDetailsToken).not.toHaveBeenCalled();
    });

    it('fetches card details token with default VIRTUAL card type', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called without card type
      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      // Then: Fetches with VIRTUAL card CSS config
      expect(mockGenerateCardDetailsToken).toHaveBeenCalledWith({
        customCss: {
          cardBackgroundColor: '#FF5C16',
          cardTextColor: '#FFFFFF',
          panBackgroundColor: '#EFEFEF',
          panTextColor: '#000000',
        },
      });
      expect(result.current.imageUrl).toBe(mockTokenResponse.imageUrl);
    });

    it('fetches card details token with VIRTUAL card type', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called with VIRTUAL type
      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.VIRTUAL);
      });

      // Then: Fetches with VIRTUAL card CSS config (orange)
      expect(mockGenerateCardDetailsToken).toHaveBeenCalledWith({
        customCss: {
          cardBackgroundColor: '#FF5C16',
          cardTextColor: '#FFFFFF',
          panBackgroundColor: '#EFEFEF',
          panTextColor: '#000000',
        },
      });
    });

    it('fetches card details token with METAL card type', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called with METAL type
      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.METAL);
      });

      // Then: Fetches with METAL card CSS config (purple)
      expect(mockGenerateCardDetailsToken).toHaveBeenCalledWith({
        customCss: {
          cardBackgroundColor: '#3D065F',
          cardTextColor: '#FFFFFF',
          panBackgroundColor: '#EFEFEF',
          panTextColor: '#000000',
        },
      });
    });

    it('fetches card details token with PHYSICAL card type', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch function is called with PHYSICAL type
      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.PHYSICAL);
      });

      // Then: Fetches with PHYSICAL card CSS config (purple)
      expect(mockGenerateCardDetailsToken).toHaveBeenCalledWith({
        customCss: {
          cardBackgroundColor: '#3D065F',
          cardTextColor: '#FFFFFF',
          panBackgroundColor: '#EFEFEF',
          panTextColor: '#000000',
        },
      });
    });

    it('sets loading state while fetching', async () => {
      // Given: SDK that takes time to respond
      let resolvePromise: (value: CardDetailsTokenResponse) => void;
      mockGenerateCardDetailsToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch starts
      let fetchPromise: Promise<CardDetailsTokenResponse | null>;
      act(() => {
        fetchPromise = result.current.fetchCardDetailsToken();
      });

      // Then: Loading is true
      expect(result.current.isLoading).toBe(true);

      // When: Fetch completes
      await act(async () => {
        resolvePromise?.(mockTokenResponse);
        await fetchPromise;
      });

      // Then: Loading is false
      expect(result.current.isLoading).toBe(false);
    });

    it('sets imageUrl on successful fetch', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch succeeds
      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      // Then: imageUrl is set
      expect(result.current.imageUrl).toBe(mockTokenResponse.imageUrl);
      expect(result.current.error).toBeNull();
    });

    it('returns response on successful fetch', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch succeeds
      let response: CardDetailsTokenResponse | null = null;
      await act(async () => {
        response = await result.current.fetchCardDetailsToken();
      });

      // Then: Returns the response
      expect(response).toEqual(mockTokenResponse);
    });
  });

  describe('Error Handling', () => {
    it('sets error on fetch failure', async () => {
      // Given: SDK that throws error
      const testError = new Error('Network error');
      mockGenerateCardDetailsToken.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch fails
      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      // Then: Error is set
      expect(result.current.error).toBe(testError);
      expect(result.current.imageUrl).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('throws error on fetch failure', async () => {
      // Given: SDK that throws error
      const testError = new Error('Network error');
      mockGenerateCardDetailsToken.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      // When/Then: Fetch throws error
      await expect(
        act(async () => {
          await result.current.fetchCardDetailsToken();
        }),
      ).rejects.toThrow('Network error');
    });

    it('wraps non-Error objects in Error', async () => {
      // Given: SDK that throws non-Error object
      mockGenerateCardDetailsToken.mockRejectedValue('string error');

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch fails
      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      // Then: Error is wrapped in Error object
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Unknown error occurred');
    });
  });

  describe('clearImageUrl', () => {
    it('clears imageUrl and error', async () => {
      // Given: Hook with imageUrl set
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      expect(result.current.imageUrl).toBe(mockTokenResponse.imageUrl);

      // When: clearImageUrl is called
      act(() => {
        result.current.clearImageUrl();
      });

      // Then: imageUrl and error are cleared
      expect(result.current.imageUrl).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('clears error when called after error', async () => {
      // Given: Hook with error set
      const testError = new Error('Network error');
      mockGenerateCardDetailsToken.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });
      expect(result.current.error).toBe(testError);

      // When: clearImageUrl is called
      act(() => {
        result.current.clearImageUrl();
      });

      // Then: Error is cleared
      expect(result.current.error).toBeNull();
    });

    it('clears isImageLoading when called', async () => {
      // Given: Hook with imageUrl set (isImageLoading would be true until image loads)
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      // isImageLoading is true until onImageLoad is called
      expect(result.current.isImageLoading).toBe(true);

      // When: clearImageUrl is called
      act(() => {
        result.current.clearImageUrl();
      });

      // Then: isImageLoading is reset
      expect(result.current.isImageLoading).toBe(false);
    });
  });

  describe('Image Loading State', () => {
    it('sets isImageLoading to true when fetch starts', async () => {
      // Given: Authenticated user with ready SDK and pending promise
      let resolvePromise: ((value: CardDetailsTokenResponse) => void) | null =
        null;
      mockGenerateCardDetailsToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch starts
      let fetchPromise: Promise<CardDetailsTokenResponse | null>;
      act(() => {
        fetchPromise = result.current.fetchCardDetailsToken();
      });

      // Then: isImageLoading is true
      expect(result.current.isImageLoading).toBe(true);

      // Cleanup
      await act(async () => {
        if (resolvePromise) {
          resolvePromise(mockTokenResponse);
        }
        await fetchPromise;
      });
    });

    it('keeps isImageLoading true after fetch completes until onImageLoad is called', async () => {
      // Given: Authenticated user with ready SDK
      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch completes
      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      // Then: isImageLoading is still true (waiting for actual image to load)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isImageLoading).toBe(true);
    });

    it('sets isImageLoading to false when onImageLoad is called', async () => {
      // Given: Hook with imageUrl set
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      expect(result.current.isImageLoading).toBe(true);

      // When: onImageLoad is called (simulating image finished loading)
      act(() => {
        result.current.onImageLoad();
      });

      // Then: isImageLoading is false
      expect(result.current.isImageLoading).toBe(false);
    });

    it('resets isImageLoading to false on fetch error', async () => {
      // Given: SDK that throws error
      const testError = new Error('Network error');
      mockGenerateCardDetailsToken.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      // When: Fetch fails
      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      // Then: isImageLoading is reset to false
      expect(result.current.isImageLoading).toBe(false);
    });
  });
});
