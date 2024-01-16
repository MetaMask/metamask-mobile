import { renderHook } from '@testing-library/react-hooks';
import useIsDataDeletionAvailable from './useIsDataDeletionAvailable'; // adjust the path as needed
import { DataDeleteStatus } from '../../../../../core/Analytics'; // adjust the path as needed

describe('useDataDeletion', () => {
  const isDeletionPossible = (
    dataDeletionTaskStatus: DataDeleteStatus,
    dataTrackedSinceLastDeletion: boolean,
  ) => {
    const { result } = renderHook(() =>
      useIsDataDeletionAvailable(
        dataDeletionTaskStatus,
        dataTrackedSinceLastDeletion,
      ),
    );
    return result.current.isDataDeletionAvailable();
  };

  it('returns display value for opted-in users', () => {
    // user is on settings before any deletion, deletion is possible
    expect(isDeletionPossible(DataDeleteStatus.unknown, true)).toBeTruthy();
    // on settings just after successful deletion, no new tracking event sent, new deletion is not possible
    expect(isDeletionPossible(DataDeleteStatus.initialized, false)).toBeFalsy();
    // back on the settings screen after successful deletion, new deletion is possible
    expect(isDeletionPossible(DataDeleteStatus.running, true)).toBeTruthy();
    // just after deletion request but failure, attempting deletion again is possible
    expect(isDeletionPossible(DataDeleteStatus.failed, true)).toBeTruthy();
  });

  it('returns display value for opted-out users', () => {
    // in all these cases, user is not tracked so no new tracking event is sent
    // user is on settings before any deletion, deletion is possible
    expect(isDeletionPossible(DataDeleteStatus.unknown, false)).toBeTruthy();
    // on settings just after successful deletion, new deletion is not possible
    expect(isDeletionPossible(DataDeleteStatus.initialized, false)).toBeFalsy();
    // back on the settings screen after successful deletion, new deletion is not possible
    expect(isDeletionPossible(DataDeleteStatus.running, false)).toBeFalsy();
    // just after deletion request but failure, attempting deletion again is possible
    expect(isDeletionPossible(DataDeleteStatus.failed, false)).toBeTruthy();
  });
});
