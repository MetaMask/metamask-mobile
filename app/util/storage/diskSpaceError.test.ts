import ReduxService from '../../core/redux/ReduxService';
import Logger from '../Logger';
import {
  isDiskSpaceError,
  reportStorageWriteError,
  resetDiskSpaceErrorSessionStateForTesting,
} from './diskSpaceError';

jest.mock('../../actions/alert', () => ({
  showAlert: jest.fn((payload) => ({ type: 'SHOW_ALERT', ...payload })),
}));

jest.mock('../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../Logger');

describe('diskSpaceError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDiskSpaceErrorSessionStateForTesting();
  });

  describe('isDiskSpaceError', () => {
    it('detects iOS out-of-space errors', () => {
      expect(
        isDiskSpaceError(
          new Error(
            'volume "User" is out of space. NSPOSIXErrorDomain Code=28 "No space left on device"',
          ),
        ),
      ).toBe(true);
    });

    it('detects NSCocoaErrorDomain out-of-space errors', () => {
      expect(isDiskSpaceError(new Error('NSCocoaErrorDomain Code=640'))).toBe(
        true,
      );
    });

    it('detects non-Error disk space messages', () => {
      expect(isDiskSpaceError('No space left on device')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isDiskSpaceError(new Error('Network request failed'))).toBe(false);
    });
  });

  describe('reportStorageWriteError', () => {
    it('deduplicates disk-full Sentry reports within a session', () => {
      const error = new Error('No space left on device');

      reportStorageWriteError(error, {
        message: 'Failed to set item for persist:root',
        key: 'persist:root',
      });
      reportStorageWriteError(error, {
        message: 'Failed to set item for persist:AssetsController',
        key: 'persist:AssetsController',
      });

      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(ReduxService.store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SHOW_ALERT',
          content: 'storage-full-alert',
        }),
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('logs non-disk errors normally on each call', () => {
      const error = new Error('Permission denied');

      reportStorageWriteError(error, { message: 'Failed to set item' });
      reportStorageWriteError(error, { message: 'Failed to set item' });

      expect(Logger.error).toHaveBeenCalledTimes(2);
      expect(ReduxService.store.dispatch).not.toHaveBeenCalled();
    });

    it('includes storage source tag when provided', () => {
      const error = new Error('No space left on device');

      reportStorageWriteError(error, {
        message: 'Failed to set item for persist:root',
        key: 'persist:root',
        source: 'persist_storage',
      });

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            error_category: 'disk_full',
            storage_source: 'persist_storage',
          }),
        }),
      );
    });

    it('reports to Sentry when store dispatch throws during alert', () => {
      const error = new Error('No space left on device');
      (ReduxService.store.dispatch as jest.Mock).mockImplementation(() => {
        throw new Error('Store not ready');
      });

      reportStorageWriteError(error, { message: 'Failed to set item' });

      expect(Logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
