import { E2ECommandTypes } from '../../../tests/framework/types';
import { dispatchQrSyncCommand } from './e2eQrSyncCommandHandler';

const mockApplyTestSyncReadyPayload = jest.fn();

jest.mock('../../core/Engine', () => ({
  context: {
    QrSyncController: {
      applyTestSyncReadyPayload: (...args: unknown[]) =>
        mockApplyTestSyncReadyPayload(...args),
    },
  },
}));

jest.mock('../Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

describe('dispatchQrSyncCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unknown command types', () => {
    dispatchQrSyncCommand({
      type: E2ECommandTypes.pushPrice,
      args: { symbol: 'BTC', price: '1' },
    });

    expect(mockApplyTestSyncReadyPayload).not.toHaveBeenCalled();
  });

  it('applies sync-ready payload from command args', () => {
    dispatchQrSyncCommand({
      type: E2ECommandTypes.applyQrSyncSyncReady,
      args: {
        mnemonic: 'test test test test test test test test test test test junk',
        isPrimary: true,
        walletName: 'Extension Wallet',
        accountName: 'Synced Account',
      },
    });

    expect(mockApplyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'test test test test test test test test test test test junk',
      isPrimary: true,
      walletName: 'Extension Wallet',
      accountName: 'Synced Account',
    });
  });
});
