import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import useCardDetailsToken, { CARD_DETAILS_CSS } from './useCardDetailsToken';
import { CardType } from '../types';
import type { CardSecureView } from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCardDetailsView: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetCardDetailsView = Engine.context.CardController
  .getCardDetailsView as jest.Mock;

const mockTokenResponse: CardSecureView = {
  url: 'https://cards.baanx.com/details-image?token=test-token-123',
  token: 'test-token-123',
};

describe('useCardDetailsToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true); // isAuthenticated
    mockGetCardDetailsView.mockResolvedValue(mockTokenResponse);
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useCardDetailsToken());

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
      mockUseSelector.mockReturnValue(false);

      const { result } = renderHook(() => useCardDetailsToken());

      let response: CardSecureView | null = null;
      await act(async () => {
        response = await result.current.fetchCardDetailsToken();
      });

      expect(response).toBeNull();
      expect(mockGetCardDetailsView).not.toHaveBeenCalled();
    });

    it('fetches card details token with default VIRTUAL card type', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      expect(mockGetCardDetailsView).toHaveBeenCalledWith({
        customCss: CARD_DETAILS_CSS[CardType.VIRTUAL],
      });
      expect(result.current.imageUrl).toBe(mockTokenResponse.url);
    });

    it('fetches card details token with VIRTUAL card type', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.VIRTUAL);
      });

      const virtualCss = mockGetCardDetailsView.mock.calls[0][0].customCss;

      mockGetCardDetailsView.mockClear();

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      const defaultCss = mockGetCardDetailsView.mock.calls[0][0].customCss;
      expect(virtualCss).toEqual(defaultCss);
    });

    it('fetches card details token with METAL card type', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.METAL);
      });

      const metalCss = mockGetCardDetailsView.mock.calls[0][0].customCss;

      mockGetCardDetailsView.mockClear();

      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.VIRTUAL);
      });

      const virtualCss = mockGetCardDetailsView.mock.calls[0][0].customCss;
      expect(metalCss).not.toEqual(virtualCss);
    });

    it('fetches card details token with PHYSICAL card type', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.PHYSICAL);
      });

      const physicalCss = mockGetCardDetailsView.mock.calls[0][0].customCss;

      mockGetCardDetailsView.mockClear();

      await act(async () => {
        await result.current.fetchCardDetailsToken(CardType.METAL);
      });

      const metalCss = mockGetCardDetailsView.mock.calls[0][0].customCss;
      expect(physicalCss).toEqual(metalCss);
    });

    it('sets loading state while fetching', async () => {
      let resolvePromise: (value: CardSecureView) => void;
      mockGetCardDetailsView.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useCardDetailsToken());

      let fetchPromise: Promise<CardSecureView | null>;
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
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      expect(result.current.imageUrl).toBe(mockTokenResponse.url);
      expect(result.current.error).toBeNull();
    });

    it('returns response on successful fetch', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      let response: CardSecureView | null = null;
      await act(async () => {
        response = await result.current.fetchCardDetailsToken();
      });

      expect(response).toEqual(mockTokenResponse);
    });
  });

  describe('Error Handling', () => {
    it('sets error on fetch failure', async () => {
      const testError = new Error('Network error');
      mockGetCardDetailsView.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.imageUrl).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('throws error on fetch failure', async () => {
      const testError = new Error('Network error');
      mockGetCardDetailsView.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      await expect(
        act(async () => {
          await result.current.fetchCardDetailsToken();
        }),
      ).rejects.toThrow('Network error');
    });

    it('wraps non-Error objects in Error', async () => {
      mockGetCardDetailsView.mockRejectedValue('string error');

      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Unknown error occurred');
    });
  });

  describe('clearImageUrl', () => {
    it('clears imageUrl and error', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      expect(result.current.imageUrl).toBe(mockTokenResponse.url);

      act(() => {
        result.current.clearImageUrl();
      });

      expect(result.current.imageUrl).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('clears error when called after error', async () => {
      const testError = new Error('Network error');
      mockGetCardDetailsView.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });
      expect(result.current.error).toBe(testError);

      act(() => {
        result.current.clearImageUrl();
      });

      expect(result.current.error).toBeNull();
    });

    it('clears isImageLoading when called', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      // isImageLoading is true until onImageLoad is called
      expect(result.current.isImageLoading).toBe(true);

      act(() => {
        result.current.clearImageUrl();
      });

      expect(result.current.isImageLoading).toBe(false);
    });
  });

  describe('Image Loading State', () => {
    it('sets isImageLoading to true when fetch starts', async () => {
      let resolvePromise: ((value: CardSecureView) => void) | null = null;
      mockGetCardDetailsView.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useCardDetailsToken());

      let fetchPromise: Promise<CardSecureView | null>;
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
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isImageLoading).toBe(true);
    });

    it('sets isImageLoading to false when onImageLoad is called', async () => {
      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        await result.current.fetchCardDetailsToken();
      });
      expect(result.current.isImageLoading).toBe(true);

      act(() => {
        result.current.onImageLoad();
      });

      expect(result.current.isImageLoading).toBe(false);
    });

    it('resets isImageLoading to false on fetch error', async () => {
      const testError = new Error('Network error');
      mockGetCardDetailsView.mockRejectedValue(testError);

      const { result } = renderHook(() => useCardDetailsToken());

      await act(async () => {
        try {
          await result.current.fetchCardDetailsToken();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.isImageLoading).toBe(false);
    });
  });
});
