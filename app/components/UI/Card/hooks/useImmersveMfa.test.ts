import { act, renderHook } from '@testing-library/react-native';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { CardEntryPoint } from '../util/metrics';
import { classifyImmersveMfaError, useImmersveMfa } from './useImmersveMfa';

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

const mockListeners: Record<
  string,
  (event: { data: { action: { type: string } } }) => void
> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: (
      event: string,
      callback: (event: { data: { action: { type: string } } }) => void,
    ) => {
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
      mockListeners.beforeRemove({ data: { action: { type: 'GO_BACK' } } });
    });
    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.markAdvancing();
      mockListeners.beforeRemove({ data: { action: { type: 'GO_BACK' } } });
      mockListeners.beforeRemove({ data: { action: { type: 'REPLACE' } } });
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
});
