import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import {
  useDisableProfileSyncing,
  useEnableProfileSyncing,
} from './useProfileSyncing';

describe('useEnableProfileSyncing()', () => {
  it('should enable profile syncing', async () => {
    const mockEnableProfileSyncingAction = jest.spyOn(
      actions,
      'enableProfileSyncing',
    );

    const { result } = renderHookWithProvider(
      () => useEnableProfileSyncing(),
      {},
    );
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockEnableProfileSyncingAction).toHaveBeenCalled();
  });
});

describe('useDisableProfileSyncing()', () => {
  it('should disable profile syncing', async () => {
    const mockDisableProfileSyncingAction = jest.spyOn(
      actions,
      'disableProfileSyncing',
    );

    const { result } = renderHookWithProvider(() => useDisableProfileSyncing());

    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockDisableProfileSyncingAction).toHaveBeenCalled();
  });
});
