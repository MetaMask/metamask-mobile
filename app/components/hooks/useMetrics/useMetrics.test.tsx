import { renderHook, act } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';
import useMetrics from './useMetrics';

jest.mock('../../../core/Analytics/MetaMetrics');

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: (callback: () => Promise<void>) => callback(),
}));

const expectedDataDeletionTaskResponse = {
  status: DataDeleteResponseStatus.ok,
};

const expectedDataDeleteStatus = {
  deletionRequestDate: undefined,
  dataDeletionRequestStatus: DataDeleteStatus.unknown,
  hasCollectedDataSinceDeletionRequest: false,
};

const expectedDate = '20/04/2024';

const expectedDataDeleteRegulationId = 'TWV0YU1hc2t1c2Vzbm9wb2ludCE';

const mockMetrics = {
  trackEvent: jest.fn(),
  trackAnonymousEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
  group: jest.fn(),
  reset: jest.fn(() => Promise.resolve()),
  flush: jest.fn(() => Promise.resolve()),
  createDataDeletionTask: jest.fn(() =>
    Promise.resolve(expectedDataDeletionTaskResponse),
  ),
  checkDataDeleteStatus: jest.fn(() =>
    Promise.resolve(expectedDataDeleteStatus),
  ),
  getDeleteRegulationCreationDate: jest.fn(() => expectedDate),
  getDeleteRegulationId: jest.fn(() => expectedDataDeleteRegulationId),
  isDataRecorded: jest.fn(() => true),
  isEnabled: jest.fn(() => true),
};

(MetaMetrics.getInstance as jest.Mock).mockResolvedValue(mockMetrics);

describe('useMetrics', () => {
  it('tracks events', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMetrics());

    await waitForNextUpdate();

    const event: IMetaMetricsEvent = {
      category: 'test',
    };

    let deletionTaskId,
      dataDeleteStatus,
      deletionDate,
      regulationId,
      isDataRecorded,
      isEnabled;

    await act(async () => {
      result.current.trackEvent(event);
      result.current.trackAnonymousEvent(event);
      await result.current.enable(true);
      await result.current.addTraitsToUser({});
      result.current.group('test', {});
      await result.current.reset();
      await result.current.flush();
      deletionTaskId = await result.current.createDataDeletionTask();
      dataDeleteStatus = await result.current.checkDataDeleteStatus();
      deletionDate = result.current.getDeleteRegulationCreationDate();
      regulationId = result.current.getDeleteRegulationId();
      isDataRecorded = result.current.isDataRecorded();
      isEnabled = result.current.isEnabled();
    });

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      event.category,
      {},
      true,
    );
    expect(mockMetrics.trackAnonymousEvent).toHaveBeenCalledWith(
      event.category,
      {},
      true,
    );
    expect(mockMetrics.enable).toHaveBeenCalledWith(true);
    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({});
    expect(mockMetrics.group).toHaveBeenCalledWith('test', {});
    expect(mockMetrics.reset).toHaveBeenCalled();
    expect(mockMetrics.flush).toHaveBeenCalled();

    expect(mockMetrics.createDataDeletionTask).toHaveBeenCalled();
    expect(deletionTaskId).toEqual(expectedDataDeletionTaskResponse);

    expect(mockMetrics.checkDataDeleteStatus).toHaveBeenCalled();
    expect(dataDeleteStatus).toEqual(expectedDataDeleteStatus);

    expect(mockMetrics.getDeleteRegulationCreationDate).toHaveBeenCalled();
    expect(deletionDate).toEqual(expectedDate);

    expect(mockMetrics.getDeleteRegulationId).toHaveBeenCalled();
    expect(regulationId).toEqual(expectedDataDeleteRegulationId);

    expect(mockMetrics.isDataRecorded).toHaveBeenCalled();
    expect(isDataRecorded).toEqual(true);

    expect(mockMetrics.isEnabled).toHaveBeenCalled();
    expect(isEnabled).toEqual(true);
  });
});
