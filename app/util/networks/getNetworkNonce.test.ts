import getNetworkNonce from './getNetworkNonce';
import Engine from '../../core/Engine';

jest.mock('./../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      setNativeCurrency: () => jest.fn(),
      setLocked: () => jest.fn(),
    },
    NetworkController: {
      setActiveNetwork: () => jest.fn(),
      setProviderType: () => jest.fn(),
      state: {
        providerConfig: {
          chainId: '3',
        },
      },
    },
    PreferencesController: {
      state: {},
    },
    TransactionController: {
      getNonceLock: jest.fn(),
    },
  },
}));

describe('getNetworkNonce', () => {
  const nonceMock = 123;
  const fromMock = '0x123';

  it('returns value from TransactionController', async () => {
    Engine.context.TransactionController.getNonceLock.mockReturnValueOnce({
      nextNonce: nonceMock,
      releaseLock: jest.fn(),
    });

    expect(await getNetworkNonce({ from: fromMock })).toBe(nonceMock);

    expect(
      Engine.context.TransactionController.getNonceLock,
    ).toHaveBeenCalledWith(fromMock);
  });

  it('releases nonce lock', async () => {
    const releaseLockMock = jest.fn();

    Engine.context.TransactionController.getNonceLock.mockReturnValueOnce({
      releaseLock: releaseLockMock,
    });

    await getNetworkNonce({ from: fromMock });

    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });
});
