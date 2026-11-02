import { act, renderHook } from '@testing-library/react-native';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { CardEntryPoint } from '../util/metrics';
import { classifyImmersveMfaError, useImmersveMfa } from './useImmersveMfa';
import type { CardMfaMethodParams } from '../Views/CardMfa/types';

const mockSubmitCredentials = jest.fn();
const mockAuthenticateWithWallet = jest.fn();
const mockAbandonAuth = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      submitCredentials: (...args: unknown[]) => mockSubmitCredentials(...args),
      authenticateWithWallet: (...args: unknown[]) =>
        mockAuthenticateWithWallet(...args),
      abandonAuth: () => mockAbandonAuth(),
    },
  },
}));

const mockResume = jest.fn();
jest.mock('./useImmersveResumeOnboarding', () => ({
  useImmersveResumeOnboarding: () => mockResume,
}));

const mockReplace = jest.fn();
const mockListeners: Record<string, () => void> = {};
const mfaParams: CardMfaMethodParams = {
  country: 'NZ',
  address: '0xabc',
  options: [],
  continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
    addListener: (event: string, callback: () => void) => {
      mockListeners[event] = callback;
      return jest.fn();
    },
  }),
}));

describe('useImmersveMfa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockListeners.beforeRemove;
  });

  it('classifies MFA provider errors', () => {
    expect(
      classifyImmersveMfaError(
        new CardProviderError(
          CardProviderErrorCode.MfaDestinationMismatch,
          'nope',
        ),
      ),
    ).toBe('destination_mismatch');
    expect(
      classifyImmersveMfaError(
        new CardProviderError(CardProviderErrorCode.InvalidOtp, 'nope'),
      ),
    ).toBe('invalid_code');
    expect(
      classifyImmersveMfaError(
        new CardProviderError(
          CardProviderErrorCode.AuthRestartRequired,
          'nope',
        ),
      ),
    ).toBe('restart_required');
    expect(classifyImmersveMfaError(new Error('other'))).toBe('unknown');
  });

  it('abandons the session on back and keeps it when moving forward', () => {
    const { result } = renderHook(() => useImmersveMfa());

    act(() => {
      mockListeners.beforeRemove();
    });
    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.markAdvancing();
      mockListeners.beforeRemove();
    });
    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);
  });

  it('resumes onboarding with alreadyAuthenticated after MFA', async () => {
    const { result } = renderHook(() => useImmersveMfa());

    await act(async () => {
      await result.current.continueAfterAuth({
        country: 'GB',
        address: '0xabc',
        continuation: {
          entrypoint: CardEntryPoint.AUTHENTICATION,
          navigateFromRoot: true,
          showAccountExistsToast: false,
        },
      });
    });

    expect(mockResume).toHaveBeenCalledWith({
      country: 'GB',
      address: '0xabc',
      email: undefined,
      phone: undefined,
      showAccountExistsToast: false,
      navigateFromRoot: true,
      entrypoint: CardEntryPoint.AUTHENTICATION,
      alreadyAuthenticated: true,
    });
  });

  it('submits the method and code through the controller', async () => {
    mockSubmitCredentials.mockResolvedValue({ done: false });
    const { result } = renderHook(() => useImmersveMfa());

    await act(async () => {
      await result.current.submitMethod('email', 'jane@example.com');
      await result.current.submitCode('123456');
    });

    expect(mockSubmitCredentials).toHaveBeenNthCalledWith(1, {
      type: 'mfa_method',
      method: 'email',
      destination: 'jane@example.com',
    });
    expect(mockSubmitCredentials).toHaveBeenNthCalledWith(2, {
      type: 'mfa_code',
      code: '123456',
    });
  });

  it('opens the next MFA screen and keeps the session', async () => {
    const params: CardMfaMethodParams = {
      country: 'NZ',
      address: '0xabc',
      options: [
        { method: 'email' as const, maskedDestination: 'j***@example.com' },
      ],
      continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
    };
    const { result } = renderHook(() => useImmersveMfa());

    await act(async () => {
      await result.current.goToNextStep(
        {
          done: false,
          nextStep: {
            type: 'mfa_code',
            method: 'email',
            maskedDestination: 'j***@example.com',
            expiresAt: null,
          },
        },
        params,
      );
    });

    expect(mockReplace).toHaveBeenCalledWith(
      'CardMfaCode',
      expect.objectContaining({ method: 'email' }),
    );

    act(() => {
      mockListeners.beforeRemove();
    });
    expect(mockAbandonAuth).not.toHaveBeenCalled();
  });

  it('opens the method screen for a method-selection step', async () => {
    const { result } = renderHook(() => useImmersveMfa());

    await act(async () => {
      await result.current.goToNextStep(
        {
          done: false,
          nextStep: {
            type: 'mfa_select',
            options: [{ method: 'phone', maskedDestination: '+64 *****1234' }],
          },
        },
        {
          country: 'NZ',
          address: '0xabc',
          options: [],
          continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
        },
      );
    });

    expect(mockReplace).toHaveBeenCalledWith(
      'CardMfaMethod',
      expect.objectContaining({
        options: [{ method: 'phone', maskedDestination: '+64 *****1234' }],
      }),
    );
  });

  it('resumes onboarding when the login is done', async () => {
    const { result } = renderHook(() => useImmersveMfa());

    await act(async () => {
      await result.current.goToNextStep(
        { done: true },
        {
          country: 'NZ',
          address: '0xabc',
          options: [],
          continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
        },
      );
    });

    expect(mockResume).toHaveBeenCalledWith(
      expect.objectContaining({
        alreadyAuthenticated: true,
        country: 'NZ',
        address: '0xabc',
      }),
    );
  });

  it('throws and leaves the session when the next step is unexpected', async () => {
    const { result } = renderHook(() => useImmersveMfa());

    await expect(
      result.current.goToNextStep(
        { done: false },
        {
          country: 'NZ',
          address: '0xabc',
          options: [],
          continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
        },
      ),
    ).rejects.toMatchObject({ code: CardProviderErrorCode.Unknown });

    act(() => {
      mockListeners.beforeRemove();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);
  });

  it('stays busy while resume data loads after a code', async () => {
    let releaseResume: () => void = () => undefined;
    mockResume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseResume = resolve;
        }),
    );
    mockSubmitCredentials.mockResolvedValue({ done: true });
    const { result } = renderHook(() => useImmersveMfa());

    let finished = Promise.resolve();
    await act(async () => {
      const authResult = await result.current.submitCode('123456');
      finished = result.current.goToNextStep(authResult, mfaParams);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      releaseResume();
      await finished;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('becomes idle when the code is rejected', async () => {
    mockSubmitCredentials.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useImmersveMfa());

    await expect(
      act(async () => {
        await result.current.submitCode('123456');
      }),
    ).rejects.toThrow('network');

    expect(result.current.isSubmitting).toBe(false);
  });

  it('becomes idle when the next step is unexpected', async () => {
    mockSubmitCredentials.mockResolvedValue({ done: false });
    const { result } = renderHook(() => useImmersveMfa());

    await expect(
      act(async () => {
        const authResult = await result.current.submitCode('123456');
        await result.current.goToNextStep(authResult, mfaParams);
      }),
    ).rejects.toMatchObject({ code: CardProviderErrorCode.Unknown });

    expect(result.current.isSubmitting).toBe(false);
  });
});
