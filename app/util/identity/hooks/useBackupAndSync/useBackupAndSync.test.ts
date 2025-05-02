import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import { useBackupAndSync } from './useBackupAndSync';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

describe('useBackupAndSync()', () => {
  it('enables backup and sync', async () => {
    const mockSetIsBackupAndSyncFeatureEnabledAction = jest.spyOn(
      actions,
      'setIsBackupAndSyncFeatureEnabled',
    );

    const { result } = renderHookWithProvider(() => useBackupAndSync(), {});
    await act(async () => {
      await result.current.setIsBackupAndSyncFeatureEnabled(
        BACKUPANDSYNC_FEATURES.main,
        true,
      );
    });

    expect(mockSetIsBackupAndSyncFeatureEnabledAction).toHaveBeenCalledWith(
      BACKUPANDSYNC_FEATURES.main,
      true,
    );
  });

  it('disables backup and sync', async () => {
    const mockSetIsBackupAndSyncFeatureEnabledAction = jest.spyOn(
      actions,
      'setIsBackupAndSyncFeatureEnabled',
    );

    const { result } = renderHookWithProvider(() => useBackupAndSync(), {});
    await act(async () => {
      await result.current.setIsBackupAndSyncFeatureEnabled(
        BACKUPANDSYNC_FEATURES.main,
        false,
      );
    });

    expect(mockSetIsBackupAndSyncFeatureEnabledAction).toHaveBeenCalledWith(
      BACKUPANDSYNC_FEATURES.main,
      false,
    );
  });
});
