import { renderHook } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from '../../../core/Analytics/MetaMetrics.types';
import { useAnalyticsDataDeletion } from './useAnalyticsDataDeletion';

const mockCreateDataDeletionTask = jest.fn();
const mockCheckDataDeleteStatus = jest.fn();
const mockGetDeleteRegulationCreationDate = jest.fn();
const mockGetDeleteRegulationId = jest.fn();
const mockIsDataRecorded = jest.fn();
const mockUpdateDataRecordingFlag = jest.fn();

jest.mock('../../../util/analytics/analyticsDataDeletion', () => ({
  createDataDeletionTask: (...args: unknown[]) =>
    mockCreateDataDeletionTask(...args),
  checkDataDeleteStatus: (...args: unknown[]) =>
    mockCheckDataDeleteStatus(...args),
  getDeleteRegulationCreationDate: (...args: unknown[]) =>
    mockGetDeleteRegulationCreationDate(...args),
  getDeleteRegulationId: (...args: unknown[]) =>
    mockGetDeleteRegulationId(...args),
  isDataRecorded: (...args: unknown[]) => mockIsDataRecorded(...args),
  updateDataRecordingFlag: (...args: unknown[]) =>
    mockUpdateDataRecordingFlag(...args),
}));

describe('useAnalyticsDataDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDataDeletionTask.mockResolvedValue({
      status: DataDeleteResponseStatus.ok,
    });
    mockCheckDataDeleteStatus.mockResolvedValue({
      deletionRequestDate: '1/2/2025',
      dataDeletionRequestStatus: DataDeleteStatus.finished,
      hasCollectedDataSinceDeletionRequest: false,
    });
    mockGetDeleteRegulationCreationDate.mockReturnValue('1/2/2025');
    mockGetDeleteRegulationId.mockReturnValue('reg-123');
    mockIsDataRecorded.mockReturnValue(false);
  });

  it('returns an object with the six data deletion methods', () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    expect(result.current.createDataDeletionTask).toBeDefined();
    expect(result.current.checkDataDeleteStatus).toBeDefined();
    expect(result.current.getDeleteRegulationCreationDate).toBeDefined();
    expect(result.current.getDeleteRegulationId).toBeDefined();
    expect(result.current.isDataRecorded).toBeDefined();
    expect(result.current.updateDataRecordingFlag).toBeDefined();
  });

  it('createDataDeletionTask forwards to util and returns its result', async () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    const taskResult = await result.current.createDataDeletionTask();

    expect(mockCreateDataDeletionTask).toHaveBeenCalledTimes(1);
    expect(taskResult.status).toBe(DataDeleteResponseStatus.ok);
  });

  it('checkDataDeleteStatus forwards to util and returns its result', async () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    const status = await result.current.checkDataDeleteStatus();

    expect(mockCheckDataDeleteStatus).toHaveBeenCalledTimes(1);
    expect(status.dataDeletionRequestStatus).toBe(DataDeleteStatus.finished);
    expect(status.deletionRequestDate).toBe('1/2/2025');
  });

  it('getDeleteRegulationCreationDate forwards to util', () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    const date = result.current.getDeleteRegulationCreationDate();

    expect(mockGetDeleteRegulationCreationDate).toHaveBeenCalledTimes(1);
    expect(date).toBe('1/2/2025');
  });

  it('getDeleteRegulationId forwards to util', () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    const id = result.current.getDeleteRegulationId();

    expect(mockGetDeleteRegulationId).toHaveBeenCalledTimes(1);
    expect(id).toBe('reg-123');
  });

  it('isDataRecorded forwards to util', () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    const value = result.current.isDataRecorded();

    expect(mockIsDataRecorded).toHaveBeenCalledTimes(1);
    expect(value).toBe(false);
  });

  it('updateDataRecordingFlag forwards to util', () => {
    const { result } = renderHook(() => useAnalyticsDataDeletion());

    result.current.updateDataRecordingFlag(true);

    expect(mockUpdateDataRecordingFlag).toHaveBeenCalledWith(true);
  });

  it('returns stable references across re-renders', () => {
    const { result, rerender } = renderHook(() => useAnalyticsDataDeletion());

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first.createDataDeletionTask).toBe(second.createDataDeletionTask);
    expect(first.checkDataDeleteStatus).toBe(second.checkDataDeleteStatus);
    expect(first.getDeleteRegulationCreationDate).toBe(
      second.getDeleteRegulationCreationDate,
    );
    expect(first.getDeleteRegulationId).toBe(second.getDeleteRegulationId);
    expect(first.isDataRecorded).toBe(second.isDataRecorded);
    expect(first.updateDataRecordingFlag).toBe(second.updateDataRecordingFlag);
  });
});
