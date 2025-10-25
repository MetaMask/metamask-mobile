import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRegisterUserConsent } from './useRegisterUserConsent';
import { useCardSDK } from '../sdk';
import { CardError, CardErrorType } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import AppConstants from '../../../../core/AppConstants';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
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
  } as unknown as CardSDK;

  const mockConsentResponse = {
    consentSetId: 'consent-123',
  };

  const testOnboardingId = 'onboarding-456';
  const testUserId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
    });

    mockUseSelector.mockReturnValue('US'); // selectedCountry

    mockGetErrorMessage.mockReturnValue('Mocked error message');
    mockCreateOnboardingConsent.mockResolvedValue(mockConsentResponse);
    mockLinkUserToConsent.mockResolvedValue(undefined);
  });

  describe('hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.consentSetId).toBe(null);
      expect(typeof result.current.registerUserConsent).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('registerUserConsent function', () => {
    describe('successful registration flow', () => {
      it('completes full registration flow for US users', async () => {
        mockUseSelector.mockReturnValue('US');
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        // Verify Stage 1: createOnboardingConsent called with correct parameters
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
          tenantId: 'tenant_baanx_global',
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: expect.any(String),
          },
        });

        // Verify Stage 2: linkUserToConsent called with correct parameters
        expect(mockLinkUserToConsent).toHaveBeenCalledWith('consent-123', {
          userId: testUserId,
        });

        // Verify final state
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.consentSetId).toBe('consent-123');
      });

      it('completes full registration flow for international users', async () => {
        mockUseSelector.mockReturnValue('CA'); // Non-US country
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        // Verify Stage 1: createOnboardingConsent called with global policy
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
          tenantId: 'tenant_baanx_global',
          metadata: {
            userAgent: AppConstants.USER_AGENT,
            timestamp: expect.any(String),
          },
        });

        // Verify Stage 2: linkUserToConsent called with international location
        expect(mockLinkUserToConsent).toHaveBeenCalledWith('consent-123', {
          userId: testUserId,
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.consentSetId).toBe('consent-123');
      });

      it('sets loading state during registration process', async () => {
        let resolveCreateConsent!: (value: typeof mockConsentResponse) => void;
        const createConsentPromise = new Promise<typeof mockConsentResponse>(
          (resolve) => {
            resolveCreateConsent = resolve;
          },
        );
        mockCreateOnboardingConsent.mockReturnValue(createConsentPromise);

        const { result } = renderHook(() => useRegisterUserConsent());

        // Start registration
        const registrationPromise = act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        // Check loading state is true during process
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);

        // Complete the process
        resolveCreateConsent(mockConsentResponse);
        await registrationPromise;

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      });

      it('includes correct timestamp in metadata', async () => {
        const beforeCall = new Date().toISOString();
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
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
          sdk: null,
          isLoading: false,
          user: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });

        const { result } = renderHook(() => useRegisterUserConsent());

        await expect(
          act(async () => {
            await result.current.registerUserConsent(
              testOnboardingId,
              testUserId,
            );
          }),
        ).rejects.toThrow('Card SDK not initialized');

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
      });

      it('handles createOnboardingConsent failure', async () => {
        const testError = new CardError(
          CardErrorType.NETWORK_ERROR,
          'Network failed',
        );
        mockCreateOnboardingConsent.mockRejectedValue(testError);
        mockGetErrorMessage.mockReturnValue('Network error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(mockGetErrorMessage).toHaveBeenCalledWith(testError);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Network error occurred');
        expect(result.current.consentSetId).toBe(null);
      });

      it('handles missing consentSetId from createOnboardingConsent', async () => {
        mockCreateOnboardingConsent.mockResolvedValue({ consentSetId: null });

        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(
          'Failed to create onboarding consent',
        );
        expect(result.current.consentSetId).toBe(null);
        expect(mockLinkUserToConsent).not.toHaveBeenCalled();
      });

      it('handles linkUserToConsent failure', async () => {
        const testError = new CardError(
          CardErrorType.SERVER_ERROR,
          'Server error',
        );
        mockLinkUserToConsent.mockRejectedValue(testError);
        mockGetErrorMessage.mockReturnValue('Server error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(mockCreateOnboardingConsent).toHaveBeenCalled();
        expect(mockLinkUserToConsent).toHaveBeenCalled();
        expect(mockGetErrorMessage).toHaveBeenCalledWith(testError);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Server error occurred');
      });

      it('handles generic errors', async () => {
        const genericError = new Error('Generic error');
        mockCreateOnboardingConsent.mockRejectedValue(genericError);
        mockGetErrorMessage.mockReturnValue('Unknown error occurred');

        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(mockGetErrorMessage).toHaveBeenCalledWith(genericError);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Unknown error occurred');
      });
    });

    describe('state management during registration', () => {
      it('resets error state when starting new registration', async () => {
        const { result } = renderHook(() => useRegisterUserConsent());

        // First, set an error state
        const testError = new CardError(
          CardErrorType.NETWORK_ERROR,
          'Network failed',
        );
        mockCreateOnboardingConsent.mockRejectedValueOnce(testError);

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Mocked error message');

        // Now start a successful registration
        mockCreateOnboardingConsent.mockResolvedValueOnce(mockConsentResponse);

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.isSuccess).toBe(true);
      });

      it('resets success state when starting new registration', async () => {
        const { result } = renderHook(() => useRegisterUserConsent());

        // First successful registration
        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(result.current.isSuccess).toBe(true);

        // Start new registration (should reset success state)
        let resolveCreateConsent!: (value: typeof mockConsentResponse) => void;
        const createConsentPromise = new Promise<typeof mockConsentResponse>(
          (resolve) => {
            resolveCreateConsent = resolve;
          },
        );
        mockCreateOnboardingConsent.mockReturnValue(createConsentPromise);

        const registrationPromise = act(async () => {
          await result.current.registerUserConsent(
            'new-onboarding',
            'new-user',
          );
        });

        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isLoading).toBe(true);

        resolveCreateConsent(mockConsentResponse);
        await registrationPromise;
      });
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

      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      // Other states should remain unchanged
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });

    it('does not affect other states when clearing error', async () => {
      const { result } = renderHook(() => useRegisterUserConsent());

      // Set success state first
      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      const successState = {
        isLoading: result.current.isLoading,
        isSuccess: result.current.isSuccess,
        consentSetId: result.current.consentSetId,
      };

      // Clear error (should not affect success state)
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
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.consentSetId).toBe('consent-123');

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

      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

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
    const countryTestCases = [
      {
        country: 'US',
        expectedPolicy: 'us',
        description: 'US users',
      },
      {
        country: 'CA',
        expectedPolicy: 'global',
        description: 'Canadian users',
      },
      {
        country: 'GB',
        expectedPolicy: 'global',
        description: 'UK users',
      },
      {
        country: 'DE',
        expectedPolicy: 'global',
        description: 'German users',
      },
    ] as const;

    it.each(countryTestCases)(
      'uses correct policy and location for $description',
      async ({ country, expectedPolicy }) => {
        mockUseSelector.mockReturnValue(country);
        const { result } = renderHook(() => useRegisterUserConsent());

        await act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        });

        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith(
          expect.objectContaining({
            policyType: expectedPolicy,
          }),
        );
      },
    );
  });

  describe('SDK integration', () => {
    it('uses SDK from useCardSDK hook', async () => {
      const customSDK = {
        createOnboardingConsent: jest
          .fn()
          .mockResolvedValue(mockConsentResponse),
        linkUserToConsent: jest.fn().mockResolvedValue(undefined),
      } as unknown as CardSDK;

      mockUseCardSDK.mockReturnValue({
        sdk: customSDK,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      const { result } = renderHook(() => useRegisterUserConsent());

      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      expect(customSDK.createOnboardingConsent).toHaveBeenCalled();
      expect(customSDK.linkUserToConsent).toHaveBeenCalled();
    });

    it('handles SDK loading state', () => {
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
        isLoading: true,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      const { result } = renderHook(() => useRegisterUserConsent());

      // Hook should still initialize properly even when SDK is loading
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.registerUserConsent).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('handles undefined SDK gracefully', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      const { result } = renderHook(() => useRegisterUserConsent());

      await expect(
        act(async () => {
          await result.current.registerUserConsent(
            testOnboardingId,
            testUserId,
          );
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });

    it('handles empty consentSetId response', async () => {
      mockCreateOnboardingConsent.mockResolvedValue({ consentSetId: '' });

      const { result } = renderHook(() => useRegisterUserConsent());

      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to create onboarding consent');
      expect(mockLinkUserToConsent).not.toHaveBeenCalled();
    });

    it('handles undefined consentSetId response', async () => {
      mockCreateOnboardingConsent.mockResolvedValue({
        consentSetId: undefined,
      });

      const { result } = renderHook(() => useRegisterUserConsent());

      await act(async () => {
        await result.current.registerUserConsent(testOnboardingId, testUserId);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to create onboarding consent');
      expect(mockLinkUserToConsent).not.toHaveBeenCalled();
    });
  });

  describe('function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialFunctions = {
        registerUserConsent: result.current.registerUserConsent,
        clearError: result.current.clearError,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.registerUserConsent).toBe(
        initialFunctions.registerUserConsent,
      );
      expect(result.current.clearError).toBe(initialFunctions.clearError);
      expect(result.current.reset).toBe(initialFunctions.reset);
    });

    it('updates functions when dependencies change', () => {
      const { result, rerender } = renderHook(() => useRegisterUserConsent());

      const initialRegisterFunction = result.current.registerUserConsent;

      // Change SDK dependency
      mockUseCardSDK.mockReturnValue({
        sdk: {
          createOnboardingConsent: jest.fn(),
          linkUserToConsent: jest.fn(),
        } as unknown as CardSDK,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      rerender();

      // Function should be different due to SDK dependency change
      expect(result.current.registerUserConsent).not.toBe(
        initialRegisterFunction,
      );
    });
  });
});
