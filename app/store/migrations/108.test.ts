import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './108';
import {
  AGREED,
  METRICS_OPT_IN,
  METRICS_OPT_IN_SOCIAL_LOGIN,
} from '../../constants/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

describe('Migration 108: Migrate Social Login Metrics Opt-In to Metrics Enable System', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates socialLoginOptIn to metricsOptIn when metricsOptIn is not AGREED and socialLoginOptIn is AGREED', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(AGREED);
    mockedStorageWrapper.setItem.mockResolvedValueOnce(undefined);
    mockedStorageWrapper.removeItem.mockResolvedValueOnce(undefined);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      METRICS_OPT_IN,
      AGREED,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not set metricsOptIn when it is already AGREED', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(AGREED)
      .mockResolvedValueOnce(AGREED);
    mockedStorageWrapper.removeItem.mockResolvedValueOnce(undefined);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not set metricsOptIn when socialLoginOptIn is not AGREED', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('declined');
    mockedStorageWrapper.removeItem.mockResolvedValueOnce(undefined);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not remove socialLoginOptIn when it does not exist', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(AGREED)
      .mockResolvedValueOnce(null);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception and returns state when storage operation fails', async () => {
    const state = { some: 'state' };
    const error = new Error('Storage error');
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockRejectedValueOnce(error);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 108: Failed to migrate Social Login Metrics Opt-In',
        ),
      }),
    );
  });
});
