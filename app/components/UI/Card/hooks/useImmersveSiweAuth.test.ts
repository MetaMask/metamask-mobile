import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useImmersveSiweAuth } from './useImmersveSiweAuth';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      initiateAuth: jest.fn(),
      getCurrentAuthStep: jest.fn(),
      submitCredentials: jest.fn(),
    },
    KeyringController: {
      signPersonalMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties.mockReturnValue({ build: mockBuild }),
}));

const mockCard = Engine.context.CardController as jest.Mocked<
  typeof Engine.context.CardController
>;
const mockKeyring = Engine.context.KeyringController as jest.Mocked<
  typeof Engine.context.KeyringController
>;

describe('useImmersveSiweAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  it('initiates, signs the SIWE challenge and submits the signature', async () => {
    mockCard.initiateAuth.mockResolvedValue(undefined);
    mockCard.getCurrentAuthStep.mockReturnValue({
      type: 'siwe',
      message: 'Immersve wants you to sign in...',
    });
    (mockKeyring.signPersonalMessage as jest.Mock).mockResolvedValue('0xsig');
    mockCard.submitCredentials.mockResolvedValue({ done: true });

    const { result } = renderHook(() => useImmersveSiweAuth());

    let authResult;
    await act(async () => {
      authResult = await result.current.signIn({
        country: 'GB',
        address: '0xabc',
      });
    });

    expect(mockCard.initiateAuth).toHaveBeenCalledWith('GB', '0xabc');
    expect(mockKeyring.signPersonalMessage).toHaveBeenCalledWith({
      data:
        '0x' + Buffer.from('Immersve wants you to sign in...').toString('hex'),
      from: '0xabc',
    });
    expect(mockCard.submitCredentials).toHaveBeenCalledWith({
      type: 'siwe',
      signature: '0xsig',
    });
    expect(authResult).toStrictEqual({ done: true });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_SIWE_AUTH_STARTED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_SIWE_AUTH_COMPLETED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'immersve' }),
    );
  });

  it('throws and records an error when the step is not a SIWE challenge', async () => {
    mockCard.initiateAuth.mockResolvedValue(undefined);
    mockCard.getCurrentAuthStep.mockReturnValue({ type: 'email_password' });

    const { result } = renderHook(() => useImmersveSiweAuth());

    await act(async () => {
      await expect(
        result.current.signIn({ country: 'GB', address: '0xabc' }),
      ).rejects.toThrow();
    });

    expect(mockKeyring.signPersonalMessage).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_SIWE_AUTH_FAILED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'immersve',
        error_type: 'unexpected_auth_step',
      }),
    );
  });
});
