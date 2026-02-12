import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate, { migrationVersion } from './119';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  TRUE,
} from '../../constants/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  getItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

describe(`Migration ${migrationVersion}: Derive osAuthEnabled from existing auth preferences`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sets osAuthEnabled to false when allowLoginWithRememberMe is true', async () => {
    const state = { security: { allowLoginWithRememberMe: true } };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual({
      security: { allowLoginWithRememberMe: true, osAuthEnabled: false },
    });
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets osAuthEnabled to true when biometrics is enabled (BIOMETRY_CHOICE_DISABLED is null)', async () => {
    const state = { security: { allowLoginWithRememberMe: false } };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(null) // BIOMETRY_CHOICE_DISABLED - not set
      .mockResolvedValueOnce(TRUE); // PASSCODE_DISABLED - set

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual({
      security: { allowLoginWithRememberMe: false, osAuthEnabled: true },
    });
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      BIOMETRY_CHOICE_DISABLED,
    );
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      PASSCODE_DISABLED,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets osAuthEnabled to true when passcode is enabled (PASSCODE_DISABLED is null)', async () => {
    const state = { security: {} }; // allowLoginWithRememberMe is undefined
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(TRUE) // BIOMETRY_CHOICE_DISABLED - set
      .mockResolvedValueOnce(null); // PASSCODE_DISABLED - not set

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual({
      security: { osAuthEnabled: true },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets osAuthEnabled to false when both legacy flags are unset (no legacy preference)', async () => {
    const state = { security: {} };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(null) // BIOMETRY_CHOICE_DISABLED - not set
      .mockResolvedValueOnce(null); // PASSCODE_DISABLED - not set

    const migratedState = await migrate(state);

    // Neither legacyUserChoseBiometrics nor legacyUserChosePasscode is true when both flags are null
    expect(migratedState).toStrictEqual({
      security: { osAuthEnabled: false },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  describe('error handling', () => {
    it('returns state unchanged and captures exception when security object does not exist', async () => {
      const state = { other: 'data' };
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = await migrate(state);

      // State is unchanged; migration throws when accessing security.allowLoginWithRememberMe
      expect(migratedState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `Migration ${migrationVersion}: Failed to migrate osAuthEnabled`,
          ),
        }),
      );
      expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    });

    it('captures exception and returns state unchanged when storage read fails', async () => {
      const state = { security: {} };
      const error = new Error('Storage error');
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem.mockRejectedValueOnce(error);

      const migratedState = await migrate(state);

      expect(migratedState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `Migration ${migrationVersion}: Failed to migrate osAuthEnabled`,
          ),
        }),
      );
    });
  });
});
