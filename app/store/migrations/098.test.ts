import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './098';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

describe('Migration 98: Remove SOLANA_FEATURE_MODAL_SHOWN from Storage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('removes SOLANA_FEATURE_MODAL_SHOWN from storage successfully', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.removeItem.mockResolvedValueOnce(undefined);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      'SOLANA_FEATURE_MODAL_SHOWN',
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception but returns state unchanged when storage removal fails', async () => {
    const state = { some: 'state' };
    const error = new Error('Storage error');
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.removeItem.mockRejectedValueOnce(error);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      'SOLANA_FEATURE_MODAL_SHOWN',
    );
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Failed to remove SOLANA_FEATURE_MODAL_SHOWN from Storage',
        ),
      }),
    );
  });
});
