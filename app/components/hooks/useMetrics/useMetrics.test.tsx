import { renderHook, act } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';
import useMetrics from './useMetrics';

jest.mock('../../../core/Analytics/MetaMetrics');

// allows runAfterInteractions to return immediately
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
  createDataDeletionTask: jest.fn(() =>
    Promise.resolve(expectedDataDeletionTaskResponse),
  ),
  checkDataDeleteStatus: jest.fn(() =>
    Promise.resolve(expectedDataDeleteStatus),
  ),
  getDeleteRegulationCreationDate: jest.fn(() => expectedDate),
  getDeleteRegulationId: jest.fn(() => expectedDataDeleteRegulationId),
  isDataRecorded: jest.fn(() => true),
  isInitialized: jest.fn(() => false),
  isEnabled: jest.fn(() => true),
  init: jest.fn(() => Promise.resolve(false)),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('useMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses MetaMetrics instance', async () => {
    const { result } = renderHook(() => useMetrics());
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "addTraitsToUser": [MockFunction],
        "checkDataDeleteStatus": [MockFunction],
        "createDataDeletionTask": [MockFunction],
        "enable": [MockFunction],
        "getDeleteRegulationCreationDate": [MockFunction],
        "getDeleteRegulationId": [MockFunction],
        "init": [MockFunction],
        "isDataRecorded": [MockFunction],
        "isEnabled": [MockFunction],
        "isInitialized": [MockFunction],
        "trackAnonymousEvent": [Function],
        "trackEvent": [Function],
      }
    `);
  });

  it('calls MetaMetrics functions', async () => {
    const { result } = renderHook(() => useMetrics());

    const event: IMetaMetricsEvent = {
      category: 'test',
    };

    const {
      trackEvent,
      trackAnonymousEvent,
      enable,
      addTraitsToUser,
      createDataDeletionTask,
      checkDataDeleteStatus,
      getDeleteRegulationCreationDate,
      getDeleteRegulationId,
      isDataRecorded,
      isInitialized,
      isEnabled,
      init,
    } = result.current;

    let deletionTaskIdValue,
      dataDeleteStatusValue,
      deletionDateValue,
      regulationIdValue,
      isDataRecordedValue,
      isInitializedValue,
      initValue,
      isEnabledValue;

    await act(async () => {
      await init();
      trackEvent(event);
      trackAnonymousEvent(event);
      await enable(true);
      await addTraitsToUser({});
      deletionTaskIdValue = await createDataDeletionTask();
      dataDeleteStatusValue = await checkDataDeleteStatus();
      deletionDateValue = getDeleteRegulationCreationDate();
      regulationIdValue = getDeleteRegulationId();
      isDataRecordedValue = isDataRecorded();
      isInitializedValue = isInitialized();
      initValue = await init();
      isEnabledValue = isEnabled();
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

    expect(mockMetrics.createDataDeletionTask).toHaveBeenCalled();
    expect(deletionTaskIdValue).toEqual(expectedDataDeletionTaskResponse);

    expect(mockMetrics.checkDataDeleteStatus).toHaveBeenCalled();
    expect(dataDeleteStatusValue).toEqual(expectedDataDeleteStatus);

    expect(mockMetrics.getDeleteRegulationCreationDate).toHaveBeenCalled();
    expect(deletionDateValue).toEqual(expectedDate);

    expect(mockMetrics.getDeleteRegulationId).toHaveBeenCalled();
    expect(regulationIdValue).toEqual(expectedDataDeleteRegulationId);

    expect(mockMetrics.isDataRecorded).toHaveBeenCalled();
    expect(isDataRecordedValue).toEqual(true);

    expect(mockMetrics.isInitialized).toHaveBeenCalled();
    expect(isInitializedValue).toBeFalsy();

    expect(mockMetrics.init).toHaveBeenCalled();
    expect(initValue).toBeFalsy();

    expect(mockMetrics.isEnabled).toHaveBeenCalled();
    expect(isEnabledValue).toBeTruthy();
  });
});
