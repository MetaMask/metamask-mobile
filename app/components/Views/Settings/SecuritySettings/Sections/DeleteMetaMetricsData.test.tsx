import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from '../../../../../core/Analytics';
import { useAnalyticsDataDeletion } from '../../../../hooks/useAnalyticsDataDeletion';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import useDataDeletion from './useDataDeletion';
import DeleteMetaMetricsData from './DeleteMetaMetricsData';

jest.mock('../../../../hooks/useAnalyticsDataDeletion');
jest.mock('../../../../hooks/useAnalytics/useAnalytics');
jest.mock('./useDataDeletion');

const renderComponent = (metricsOptin: boolean) =>
  renderWithProvider(<DeleteMetaMetricsData metricsOptin={metricsOptin} />, {
    state: { engine: { backgroundState } },
  });

describe('DeleteMetaMetricsData', () => {
  const mockCreateDataDeletionTask = jest.fn();
  const mockCheckDataDeleteStatus = jest.fn();
  const mockSetDataTrackedSinceLastDeletion = jest.fn();
  const mockSetDataDeletionTaskStatus = jest.fn();
  const mockSetDeletionTaskDate = jest.fn();
  const mockIsDataDeletionAvailable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCheckDataDeleteStatus.mockResolvedValue({
      deletionRequestDate: undefined,
      dataDeletionRequestStatus: DataDeleteStatus.unknown,
    });
    mockIsDataDeletionAvailable.mockReturnValue(true);

    jest.mocked(useAnalyticsDataDeletion).mockReturnValue({
      createDataDeletionTask: mockCreateDataDeletionTask,
      checkDataDeleteStatus: mockCheckDataDeleteStatus,
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
    });

    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn().mockReturnValue({
        addProperties: jest.fn().mockReturnThis(),
        addSensitiveProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ReturnType<typeof useAnalytics>);

    jest.mocked(useDataDeletion).mockReturnValue({
      isDataDeletionAvailable: mockIsDataDeletionAvailable,
      deletionTaskDate: undefined,
      setDataDeletionTaskStatus: mockSetDataDeletionTaskStatus,
      setDeletionTaskDate: mockSetDeletionTaskDate,
      setDataTrackedSinceLastDeletion: mockSetDataTrackedSinceLastDeletion,
    });
  });

  it('resets dataTrackedSinceLastDeletion to false right after a successful deletion request', async () => {
    mockCreateDataDeletionTask.mockResolvedValue({
      status: DataDeleteResponseStatus.ok,
    });

    const { getByText, getByTestId } = renderComponent(true);

    fireEvent.press(getByTestId('delete-metrics-button'));
    fireEvent.press(getByText(strings('app_settings.clear')));

    await waitFor(() => {
      expect(mockCreateDataDeletionTask).toHaveBeenCalledTimes(1);
      expect(mockSetDataTrackedSinceLastDeletion).toHaveBeenCalledWith(false);
    });
  });

  it('does not reset dataTrackedSinceLastDeletion when the deletion request fails', async () => {
    mockCreateDataDeletionTask.mockResolvedValue({
      status: DataDeleteResponseStatus.error,
    });

    const { getByText, getByTestId } = renderComponent(true);

    fireEvent.press(getByTestId('delete-metrics-button'));
    fireEvent.press(getByText(strings('app_settings.clear')));

    await waitFor(() => {
      expect(mockCreateDataDeletionTask).toHaveBeenCalledTimes(1);
    });

    // The only false call would come from the failed deletion path. The mount
    // effect seeds with metricsOptin (true) so any (false) here means the fix
    // ran when it shouldn't have.
    expect(
      mockSetDataTrackedSinceLastDeletion.mock.calls.filter(
        ([arg]) => arg === false,
      ),
    ).toHaveLength(0);
  });
});
