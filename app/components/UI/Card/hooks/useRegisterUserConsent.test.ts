import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRegisterUserConsent } from './useRegisterUserConsent';
import { useCardSDK } from '../sdk';
import { CardError, CardErrorType } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import AppConstants from '../../../../core/AppConstants';
import { CardSDK } from '../sdk/CardSDK';

const mockFetchQuery = jest.fn();

const mockQueryClient = {
  fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => mockQueryClient),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../util/getErrorMessage', () => ({
  getErrorMessage: jest.fn(),
}));

jest.mock('../../../../core/AppConstants', () => ({
  USER_AGENT: 'MetaMask Mobile Test Agent',
  BUNDLE_IDS: {
    ANDROID: 'io.metamask.test',
    IOS: 'io.metamask.test',
  },
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<
  typeof getErrorMessage
>;

describe('useRegisterUserConsent', () => {
  const mockCreateOnboardingConsent = jest.fn();
  const mockLinkUserToConsent = jest.fn();

  const mockSDK = {
    createOnboardingConsent: mockCreateOnboardingConsent,
    linkUserToConsent: mockLinkUserToConsent,
    getConsentSetByOnboardingId: jest.fn(),
  } as unknown as CardSDK;

  const mockConsentResponse = {
    consentSetId: 'consent-123',
  };

  const testOnboardingId = 'onboarding-456';
  const testUserId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockUseSelector.mockReturnValue('us');
    mockGetErrorMessage.mockReturnValue('Mocked error message');
    mockCreateOnboardingConsent.mockResolvedValue(mockConsentResponse);
    mockLinkUserToConsent.mockResolvedValue(undefined);
    mockFetchQuery.mockResolvedValue(null);
  });

  describe('hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.consentSetId).toBe(null);
      expect(typeof result.current.createOnboardingConsent).toBe('function');
      expect(typeof result.current.linkUserToConsent).toBe('function');
      expect(typeof result.current.getOnboardingConsentSetByOnboardingId).toBe(
        'function',
      );
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('getOnboardingConsentSetByOnboardingId function', () => {
    it('returns consent set when it exists', async () => {
      const mockConsentSet = {
        consentSetId: 'existing-consent-123',
        userId: 'user-id',
        completedAt: '2024-01-01T00:00:00.000Z',
      };

      mockFetchQuery.mockResolvedValue(mockConsentSet);

      const { result } = renderHook(() => useRegisterUserConsent());

      let retrievedConsentSet;
      await act(async () => {
        retrievedConsentSet =
          await result.current.getOnboardingConsentSetByOnboardingId(
            testOnboardingId,
          );
      });

      expect(mockFetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['card', 'dashboard', 'consentSet', testOnboardingId],
          staleTime: 30_000,
        }),
      );
      expect(retrievedConsentSet).toEqual(mockConsentSet);
    });

    it('returns null when no consent exists', async () => {
      mockFetchQuery.mockResolvedValue(null);

      const { result } = renderHook(() => useRegisterUserConsent());

      let retrievedConsentSet;
      await act(async () => {
        retrievedConsentSet =
          await result.current.getOnboardingConsentSetByOnboardingId(
            testOnboardingId,
          );
      });

      expect(retrievedConsentSet).toBeNull();
    });

    it('throws error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useRegisterUserConsent());

      await expect(
        act(async () => {
          await result.current.getOnboardingConsentSetByOnboardingId(
            testOnboardingId,
          );
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });

    it('throws error when fetchQuery fails', async () => {
      const testError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network failed',
      );
      mockFetchQuery.mockRejectedValue(testError);

      const { result } = renderHook(() => useRegisterUserConsent());

      await expect(
        act(async () => {
          await result.current.getOnboardingConsentSetByOnboardingId(
            testOnboardingId,
          );
        }),
      ).rejects.toThrow(testError);
    });
  });

  describe('createOnboardingConsent function', () => {
    describe('successful consent creation', () => {
      it('creates consent record for US users with eSignAct consent', async () => {
        const { result } = renderHook(() => useRegisterUserConsent());

        let returnedConsentSetId = '';
        await act(async () => {
          returnedConsentSetId =
            await result.current.createOnboardingConsent(testOnboardingId);
        });

        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith({
          policyType: 'us',
          onboardingId: testOnboardingId,
          consents: [
            {
              consentType: 'eSignAct',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'termsAndPrivacy',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'marketingNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'smsNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'emailNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
          ],
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: expect.any(String),
          },
        });

        expect(returnedConsentSetId).toBe('consent-123');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false); // Not success until linked
        expect(result.current.isError).toBe(false);
        expect(result.current.consentSetId).toBe('consent-123');
      });

      it('creates consent record for international users without eSignAct', async () => {
        mockUseSelector.mockReturnValue('international');
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        });

        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith({
          policyType: 'global',
          onboardingId: testOnboardingId,
          consents: [
            {
              consentType: 'termsAndPrivacy',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'marketingNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'smsNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
            {
              consentType: 'emailNotifications',
              consentStatus: 'granted',
              metadata: {
                userAgent: AppConstants.USER_AGENT,
              },
            },
          ],
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: expect.any(String),
          },
        });

        expect(result.current.consentSetId).toBe('consent-123');
      });

      it('sets loading state during consent creation', async () => {
        let resolveCreateConsent!: (value: typeof mockConsentResponse) => void;
        const createConsentPromise = new Promise<typeof mockConsentResponse>(
          (resolve) => {
            resolveCreateConsent = resolve;
          },
        );
        mockCreateOnboardingConsent.mockReturnValue(createConsentPromise);

        const { result } = renderHook(() => useRegisterUserConsent());

        const creationPromise = act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isError).toBe(false);

        resolveCreateConsent(mockConsentResponse);
        await creationPromise;

        expect(result.current.isLoading).toBe(false);
      });

      it('includes current timestamp in metadata', async () => {
        const beforeCall = new Date().toISOString();
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        });

        const afterCall = new Date().toISOString();
        const callArgs = mockCreateOnboardingConsent.mock.calls[0][0];
        const timestamp = callArgs.metadata.timestamp;

        expect(timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        expect(timestamp >= beforeCall).toBe(true);
        expect(timestamp <= afterCall).toBe(true);
      });
    });

    describe('error handling', () => {
      it('throws error when SDK is not available', async () => {
        mockUseCardSDK.mockReturnValue({
          ...jest.requireMock('../sdk'),
          sdk: null,
        });

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.createOnboardingConsent(testOnboardingId);
          }),
        ).rejects.toThrow('Card SDK not initialized');
      });

      it('handles createOnboardingConsent API failure', async () => {
        const testError = new CardError(
          CardErrorType.NETWORK_ERROR,
          'Network failed',
        );
        mockCreateOnboardingConsent.mockRejectedValue(testError);
        mockGetErrorMessage.mockReturnValue('Network error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.createOnboardingConsent(testOnboardingId);
          }),
        ).rejects.toThrow();

        expect(mockGetErrorMessage).toHaveBeenCalledWith(testError);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Network error occurred');
        expect(result.current.consentSetId).toBe(null);
      });

      it('throws error when consentSetId is missing from response', async () => {
        mockCreateOnboardingConsent.mockResolvedValue({ consentSetId: null });
        mockGetErrorMessage.mockReturnValue(
          'Failed to create onboarding consent',
        );

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.createOnboardingConsent(testOnboardingId);
          }),
        ).rejects.toThrow('Failed to create onboarding consent');

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(
          'Failed to create onboarding consent',
        );
        expect(result.current.consentSetId).toBe(null);
      });

      it('throws error when consentSetId is empty string', async () => {
        mockCreateOnboardingConsent.mockResolvedValue({ consentSetId: '' });
        mockGetErrorMessage.mockReturnValue(
          'Failed to create onboarding consent',
        );

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.createOnboardingConsent(testOnboardingId);
          }),
        ).rejects.toThrow('Failed to create onboarding consent');

        expect(result.current.isError).toBe(true);
        expect(result.current.consentSetId).toBe(null);
      });

      it('handles generic errors during consent creation', async () => {
        const genericError = new Error('Generic error');
        mockCreateOnboardingConsent.mockRejectedValue(genericError);
        mockGetErrorMessage.mockReturnValue('Unknown error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.createOnboardingConsent(testOnboardingId);
          }),
        ).rejects.toThrow();

        expect(mockGetErrorMessage).toHaveBeenCalledWith(genericError);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Unknown error occurred');
      });
    });
  });

  describe('linkUserToConsent function', () => {
    const testConsentSetId = 'consent-123';

    describe('successful consent linking', () => {
      it('links user to consent record', async () => {
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.linkUserToConsent(testConsentSetId, testUserId);
        });

        expect(mockLinkUserToConsent).toHaveBeenCalledWith(testConsentSetId, {
          userId: testUserId,
        });
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it('sets loading state during consent linking', async () => {
        let resolveLinkConsent!: () => void;
        const linkConsentPromise = new Promise<void>((resolve) => {
          resolveLinkConsent = resolve;
        });
        mockLinkUserToConsent.mockReturnValue(linkConsentPromise);

        const { result } = renderHook(() => useRegisterUserConsent());

        const linkingPromise = act(async () => {
          await result.current.linkUserToConsent(testConsentSetId, testUserId);
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isError).toBe(false);

        resolveLinkConsent();
        await linkingPromise;

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      });
    });

    describe('error handling', () => {
      it('throws error when SDK is not available', async () => {
        mockUseCardSDK.mockReturnValue({
          ...jest.requireMock('../sdk'),
          sdk: null,
        });

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.linkUserToConsent(
              testConsentSetId,
              testUserId,
            );
          }),
        ).rejects.toThrow('Card SDK not initialized');
      });

      it('handles linkUserToConsent API failure', async () => {
        const testError = new CardError(
          CardErrorType.SERVER_ERROR,
          'Server error',
        );
        mockLinkUserToConsent.mockRejectedValue(testError);
        mockGetErrorMessage.mockReturnValue('Server error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.linkUserToConsent(
              testConsentSetId,
              testUserId,
            );
          }),
        ).rejects.toThrow();

        expect(mockGetErrorMessage).toHaveBeenCalledWith(testError);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Server error occurred');
      });

      it('handles generic errors during consent linking', async () => {
        const genericError = new Error('Generic error');
        mockLinkUserToConsent.mockRejectedValue(genericError);
        mockGetErrorMessage.mockReturnValue('Unknown error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.linkUserToConsent(
              testConsentSetId,
              testUserId,
            );
          }),
        ).rejects.toThrow();

        expect(mockGetErrorMessage).toHaveBeenCalledWith(genericError);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Unknown error occurred');
      });
    });
  });

  describe('state management', () => {
    it('resets error state when creating new consent', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // First, set an error state
      const testError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network failed',
      );
      mockCreateOnboardingConsent.mockRejectedValueOnce(testError);

      await expect(
        act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        }),
      ).rejects.toThrow();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Now start a successful consent creation
      mockCreateOnboardingConsent.mockResolvedValueOnce(mockConsentResponse);

      await act(async () => {
        await result.current.createOnboardingConsent(testOnboardingId);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('resets success state when creating new consent', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // First successful link
      await act(async () => {
        await result.current.linkUserToConsent('consent-123', testUserId);
      });

      expect(result.current.isSuccess).toBe(true);

      // Start new consent creation (should reset success state)
      let resolveCreateConsent!: (value: typeof mockConsentResponse) => void;
      const createConsentPromise = new Promise<typeof mockConsentResponse>(
        (resolve) => {
          resolveCreateConsent = resolve;
        },
      );
      mockCreateOnboardingConsent.mockReturnValue(createConsentPromise);

      const creationPromise = act(async () => {
        await result.current.createOnboardingConsent('new-onboarding');
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(true);

      resolveCreateConsent(mockConsentResponse);
      await creationPromise;
    });
  });

  describe('clearError function', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // Set error state
      const testError = new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Validation failed',
      );
      mockCreateOnboardingConsent.mockRejectedValue(testError);

      await expect(
        act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        }),
      ).rejects.toThrow();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      // Other states remain unchanged
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });

    it('does not affect other states when clearing error', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // Set success state first
      await act(async () => {
        await result.current.linkUserToConsent('consent-123', testUserId);
      });

      const successState = {
        isLoading: result.current.isLoading,
        isSuccess: result.current.isSuccess,
        consentSetId: result.current.consentSetId,
      };

      // Clear error (does not affect success state)
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isLoading).toBe(successState.isLoading);
      expect(result.current.isSuccess).toBe(successState.isSuccess);
      expect(result.current.consentSetId).toBe(successState.consentSetId);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('reset function', () => {
    it('resets all state to initial values', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // Set some state
      await act(async () => {
        await result.current.createOnboardingConsent(testOnboardingId);
      });

      expect(result.current.consentSetId).toBe('consent-123');

      await act(async () => {
        await result.current.linkUserToConsent('consent-123', testUserId);
      });

      expect(result.current.isSuccess).toBe(true);

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.consentSetId).toBe(null);
    });

    it('resets error state', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // Set error state
      const testError = new CardError(CardErrorType.TIMEOUT_ERROR, 'Timeout');
      mockCreateOnboardingConsent.mockRejectedValue(testError);

      await expect(
        act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        }),
      ).rejects.toThrow();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('country-specific behavior', () => {
    it.each([
      { location: 'us', expectedPolicy: 'us' },
      { location: 'international', expectedPolicy: 'global' },
    ])(
      'uses "$expectedPolicy" policy for location "$location"',
      async ({ location, expectedPolicy }) => {
        mockUseSelector.mockReturnValue(location);
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        });

        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith(
          expect.objectContaining({
            policyType: expectedPolicy,
          }),
        );
      },
    );
  });

  describe('edge cases', () => {
    it('handles undefined consentSetId in createOnboardingConsent response', async () => {
      mockCreateOnboardingConsent.mockResolvedValue({
        consentSetId: undefined,
      });
      mockGetErrorMessage.mockReturnValue(
        'Failed to create onboarding consent',
      );

      const { result } = renderHook(() => useRegisterUserConsent());

      await expect(
        act(async () => {
          await result.current.createOnboardingConsent(testOnboardingId);
        }),
      ).rejects.toThrow('Failed to create onboarding consent');

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to create onboarding consent');
    });
  });

  describe('function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialFunctions = {
        createOnboardingConsent: result.current.createOnboardingConsent,
        linkUserToConsent: result.current.linkUserToConsent,
        getOnboardingConsentSetByOnboardingId:
          result.current.getOnboardingConsentSetByOnboardingId,
        clearError: result.current.clearError,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.createOnboardingConsent).toBe(
        initialFunctions.createOnboardingConsent,
      );
      expect(result.current.linkUserToConsent).toBe(
        initialFunctions.linkUserToConsent,
      );
      expect(result.current.getOnboardingConsentSetByOnboardingId).toBe(
        initialFunctions.getOnboardingConsentSetByOnboardingId,
      );
      expect(result.current.clearError).toBe(initialFunctions.clearError);
      expect(result.current.reset).toBe(initialFunctions.reset);
    });

    it('updates createOnboardingConsent when dependencies change', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialCreateFunction = result.current.createOnboardingConsent;

      // Change SDK dependency
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: {
          createOnboardingConsent: jest.fn(),
          linkUserToConsent: jest.fn(),
        } as unknown as CardSDK,
      });

      rerender();

      // Function is different due to SDK dependency change
      expect(result.current.createOnboardingConsent).not.toBe(
        initialCreateFunction,
      );
    });

    it('updates linkUserToConsent when SDK dependency changes', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialLinkFunction = result.current.linkUserToConsent;

      // Change SDK dependency
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: {
          createOnboardingConsent: jest.fn(),
          linkUserToConsent: jest.fn(),
          getConsentSetByOnboardingId: jest.fn(),
        } as unknown as CardSDK,
      });

      rerender();

      // Function is different due to SDK dependency change
      expect(result.current.linkUserToConsent).not.toBe(initialLinkFunction);
    });

    it('updates getOnboardingConsentSetByOnboardingId when SDK dependency changes', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialGetFunction =
        result.current.getOnboardingConsentSetByOnboardingId;

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: {
          createOnboardingConsent: jest.fn(),
          linkUserToConsent: jest.fn(),
          getConsentSetByOnboardingId: jest.fn(),
        } as unknown as CardSDK,
      });

      rerender();

      expect(result.current.getOnboardingConsentSetByOnboardingId).not.toBe(
        initialGetFunction,
      );
    });
  });
});
