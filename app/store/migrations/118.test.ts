import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate, { migrationVersion } from './118';
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

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  describe('when allowLoginWithRememberMe is true', () => {
    it('sets osAuthEnabled to false and skips storage check', async () => {
      const state = { security: { allowLoginWithRememberMe: true } };
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = await migrate(state);

      expect(migratedState).toStrictEqual({
        security: { allowLoginWithRememberMe: true, osAuthEnabled: false },
      });
      expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('sets osAuthEnabled to false even if biometrics would be available', async () => {
      const state = { security: { allowLoginWithRememberMe: true } };
      mockedEnsureValidState.mockReturnValue(true);
      // These should NOT be called since Remember Me takes priority
      mockedStorageWrapper.getItem
        .mockResolvedValueOnce(null) // BIOMETRY_CHOICE_DISABLED - not set (biometrics enabled)
        .mockResolvedValueOnce(null); // PASSCODE_DISABLED - not set

      const migratedState = await migrate(state);

      expect(migratedState).toStrictEqual({
        security: { allowLoginWithRememberMe: true, osAuthEnabled: false },
      });
      expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    });
  });

  describe('when allowLoginWithRememberMe is false or undefined', () => {
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

    it('sets osAuthEnabled to true when both biometrics and passcode are enabled', async () => {
      const state = { security: {} };
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem
        .mockResolvedValueOnce(null) // BIOMETRY_CHOICE_DISABLED - not set
        .mockResolvedValueOnce(null); // PASSCODE_DISABLED - not set

      const migratedState = await migrate(state);

      expect(migratedState).toStrictEqual({
        security: { osAuthEnabled: true },
      });
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('sets osAuthEnabled to false when both biometrics and passcode are disabled (password-only mode)', async () => {
      const state = { security: {} };
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem
        .mockResolvedValueOnce(TRUE) // BIOMETRY_CHOICE_DISABLED - set
        .mockResolvedValueOnce(TRUE); // PASSCODE_DISABLED - set

      const migratedState = await migrate(state);

      expect(migratedState).toStrictEqual({
        security: { osAuthEnabled: false },
      });
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns state unchanged when security object does not exist', async () => {
      const state = { other: 'data' };
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem
        .mockResolvedValueOnce(null) // BIOMETRY_CHOICE_DISABLED - not set
        .mockResolvedValueOnce(TRUE); // PASSCODE_DISABLED - set

      const migratedState = await migrate(state);

      // State is unchanged because typedState.security is undefined
      expect(migratedState).toStrictEqual(state);
      expect(mockedCaptureException).not.toHaveBeenCalled();
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
