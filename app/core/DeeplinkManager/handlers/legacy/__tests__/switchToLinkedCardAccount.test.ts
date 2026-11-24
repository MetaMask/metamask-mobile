import { switchToLinkedCardAccount } from '../switchToLinkedCardAccount';
import Engine from '../../../../Engine';
import Logger from '../../../../../util/Logger';

const mockFindLinkedAccountAddress = jest.fn();
jest.mock('../../../../Engine', () => ({
  setSelectedAddress: jest.fn(),
  context: {
    CardController: {
      findLinkedAccountAddress: (...args: unknown[]) =>
        mockFindLinkedAccountAddress(...args),
    },
  },
}));
jest.mock('../../../../../util/Logger');

describe('switchToLinkedCardAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the account that matches the card link', async () => {
    mockFindLinkedAccountAddress.mockResolvedValue('0xabc');

    await switchToLinkedCardAccount();

    expect(Engine.setSelectedAddress).toHaveBeenCalledWith('0xabc');
  });

  it('keeps the selected account when no account matches', async () => {
    mockFindLinkedAccountAddress.mockResolvedValue(null);

    await switchToLinkedCardAccount();

    expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('logs and resolves when the lookup fails', async () => {
    mockFindLinkedAccountAddress.mockRejectedValue(new Error('boom'));

    await expect(switchToLinkedCardAccount()).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('logs and resolves when selecting the linked account throws', async () => {
    const switchError = new Error('Account switch failed');
    mockFindLinkedAccountAddress.mockResolvedValue('0xabc');
    (Engine.setSelectedAddress as jest.Mock).mockImplementationOnce(() => {
      throw switchError;
    });

    await expect(switchToLinkedCardAccount()).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalledWith(
      switchError,
      '[switchToLinkedCardAccount] Failed to switch to linked card account',
    );
  });
});
