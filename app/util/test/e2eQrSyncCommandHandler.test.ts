import { E2ECommandTypes } from '../../../tests/framework/types';
import { dispatchQrSyncCommand } from './e2eQrSyncCommandHandler';
import Logger from '../Logger';

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

  it('defaults optional args when omitted or non-string', () => {
    dispatchQrSyncCommand({
      type: E2ECommandTypes.applyQrSyncSyncReady,
      args: {
        isPrimary: false,
        walletName: 123,
        accountName: null,
      },
    });

    expect(mockApplyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: '',
      isPrimary: false,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('logs when applyTestSyncReadyPayload throws', () => {
    mockApplyTestSyncReadyPayload.mockImplementationOnce(() => {
      throw new Error('apply failed');
    });

    dispatchQrSyncCommand({
      type: E2ECommandTypes.applyQrSyncSyncReady,
      args: { mnemonic: 'x' },
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'E2E QR Sync command apply-qr-sync-sync-ready failed',
    );
  });
});
