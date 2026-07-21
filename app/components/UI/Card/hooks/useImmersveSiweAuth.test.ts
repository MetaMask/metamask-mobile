import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
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

const mockCard = Engine.context.CardController as jest.Mocked<
  typeof Engine.context.CardController
>;
const mockKeyring = Engine.context.KeyringController as jest.Mocked<
  typeof Engine.context.KeyringController
>;

describe('useImmersveSiweAuth', () => {
  beforeEach(() => jest.clearAllMocks());

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
  });
});
