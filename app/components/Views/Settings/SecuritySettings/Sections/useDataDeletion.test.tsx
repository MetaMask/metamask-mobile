import { renderHook } from '@testing-library/react-hooks';
import { DataDeleteStatus } from '../../../../../core/Analytics';
import useDataDeletion from './useDataDeletion';
import { act } from '@testing-library/react-native';

/**
 * This test suite checks that all the possible cases of the deletion process are covered.
 * It also checks that the display value is correct for each case.
 * It also serves as a documentation of the deletion settings display logic.
 */
describe('useDataDeletion', () => {
  const testCases = [
    // Opted-in users
    {
      description:
        'optin user is on settings before any deletion, deletion is possible',
      initialStatus: DataDeleteStatus.unknown,
      initialTracked: true,
      expected: true,
    },
    {
      description:
        'optin user is on settings just after successful deletion, no new tracking event sent, new deletion is not possible',
      initialStatus: DataDeleteStatus.initialized,
      initialTracked: false,
      expected: false,
    },
    {
      description:
        'optin user is back on the settings screen after successful deletion, new deletion is possible',
      initialStatus: DataDeleteStatus.initialized,
      initialTracked: true,
      expected: true,
    },
    {
      description:
        'optin user is back on the settings screen when deletion is running, new deletion is possible',
      initialStatus: DataDeleteStatus.running,
      initialTracked: true,
      expected: true,
    },
    {
      description:
        'optin user is back on the settings screen after finsihed deletion, new deletion is possible',
      initialStatus: DataDeleteStatus.finished,
      initialTracked: true,
      expected: true,
    },
    {
      description:
        'optin user is on the settings just after failed deletion, new deletion is possible',
      initialStatus: DataDeleteStatus.failed,
      initialTracked: false,
      expected: true,
    },
    {
      description:
        'optin user is back on the settings screen after failed deletion, new deletion is possible',
      initialStatus: DataDeleteStatus.failed,
      initialTracked: true,
      expected: true,
    },
    // Opted-out users
    {
      description:
        'optout user is on settings before any deletion, deletion is possible',
      initialStatus: DataDeleteStatus.unknown,
      initialTracked: false,
      expected: true,
    },
    {
      description:
        'optout user is on settings just after successful deletion, no new tracking event sent, new deletion is not possible',
      initialStatus: DataDeleteStatus.initialized,
      initialTracked: false,
      expected: false,
    },
    {
      description:
        'optout user is back on the settings screen after successful deletion, new deletion is not possible',
      initialStatus: DataDeleteStatus.initialized,
      initialTracked: false,
      expected: false,
    },
    {
      description:
        'optout user is back on the settings screen when deletion is running, new deletion is not possible',
      initialStatus: DataDeleteStatus.running,
      initialTracked: false,
      expected: false,
    },
    {
      description:
        'optout user is back on the settings screen after finsihed deletion, new deletion is not possible',
      initialStatus: DataDeleteStatus.finished,
      initialTracked: false,
      expected: false,
    },
    {
      description:
        'optout user is on the settings just after deletion failed, new deletion is possible',
      initialStatus: DataDeleteStatus.failed,
      initialTracked: false,
      expected: true,
    },
    {
      description:
        'optout user is back on the settings screen after failed deletion, new deletion is possible',
      initialStatus: DataDeleteStatus.failed,
      initialTracked: false,
      expected: true,
    },
  ];

  testCases.forEach((testCase) => {
    it(testCase.description, async () => {
      const { result, rerender } = renderHook(() => useDataDeletion());
      act(() => {
        result.current.setDataDeletionTaskStatus(testCase.initialStatus);
        result.current.setDataTrackedSinceLastDeletion(testCase.initialTracked);
      });
      rerender(); //required to take the new state into account

      expect(result.current.isDataDeletionAvailable()).toBe(testCase.expected);
    });
  });
});
