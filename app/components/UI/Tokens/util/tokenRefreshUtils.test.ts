import { performEvmTokenRefresh } from './tokenRefreshUtils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipChainId } from '@metamask/utils';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      getAssets: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const fakeAccounts = [
  { id: 'account-1' },
  { id: 'account-2' },
] as unknown as InternalAccount[];

const fakeChainIds = ['eip155:1', 'eip155:2'] as CaipChainId[];

describe('performEvmTokenRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('force-refreshes AssetsController for the given accounts and chains', async () => {
    await performEvmTokenRefresh(fakeAccounts, fakeChainIds);

    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      fakeAccounts,
      expect.objectContaining({
        forceUpdate: true,
        chainIds: fakeChainIds,
      }),
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('does nothing when there are no accounts', async () => {
    await performEvmTokenRefresh([], fakeChainIds);

    expect(Engine.context.AssetsController.getAssets).not.toHaveBeenCalled();
  });

  it('does nothing when there are no chain ids', async () => {
    await performEvmTokenRefresh(fakeAccounts, []);

    expect(Engine.context.AssetsController.getAssets).not.toHaveBeenCalled();
  });

  it('logs timeout as non-error when refresh times out', async () => {
    jest.useFakeTimers();

    (Engine.context.AssetsController.getAssets as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10000); // Takes longer than timeout
        }),
    );

    const refreshPromise = performEvmTokenRefresh(fakeAccounts, fakeChainIds);

    jest.advanceTimersByTime(5000);
    await refreshPromise;

    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('performEvmTokenRefresh timed out'),
    );
    expect(Logger.error).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('completes without error when the refresh call rejects', async () => {
    (
      Engine.context.AssetsController.getAssets as jest.Mock
    ).mockRejectedValueOnce(new Error('Simulated error'));

    await performEvmTokenRefresh(fakeAccounts, fakeChainIds);

    expect(Logger.error).not.toHaveBeenCalled();
  });
});
