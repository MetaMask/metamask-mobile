import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import {
  useDisableProfileSyncing,
  useEnableProfileSyncing,
} from './useProfileSyncing';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

describe('useEnableProfileSyncing()', () => {
  it('should enable profile syncing', async () => {
    const mockSetIsBackupAndSyncFeatureEnabledAction = jest.spyOn(
      actions,
      'setIsBackupAndSyncFeatureEnabled',
    );

    const { result } = renderHookWithProvider(
      () => useEnableProfileSyncing(),
      {},
    );
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockSetIsBackupAndSyncFeatureEnabledAction).toHaveBeenCalledWith(
      BACKUPANDSYNC_FEATURES.main,
      true,
    );
  });
});

describe('useDisableProfileSyncing()', () => {
  it('should disable profile syncing', async () => {
    const mockSetIsBackupAndSyncFeatureEnabledAction = jest.spyOn(
      actions,
      'setIsBackupAndSyncFeatureEnabled',
    );

    const { result } = renderHookWithProvider(() => useDisableProfileSyncing());

    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockSetIsBackupAndSyncFeatureEnabledAction).toHaveBeenCalledWith(
      BACKUPANDSYNC_FEATURES.main,
      false,
    );
  });
});
