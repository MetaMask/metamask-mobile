import { renderHook, act } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';
import useMetrics from './useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { IUseMetricsHook } from './useMetrics.types';

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
  isEnabled: jest.fn(() => true),
  getMetaMetricsId: jest.fn(() =>
    Promise.resolve('4d657461-4d61-436b-8e73-46756e212121'),
  ),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

class MockEventDataBuilder extends MetricsEventBuilder {
  static getMockEvent(event: IMetaMetricsEvent | ITrackingEvent) {
    return new MockEventDataBuilder(event);
  }

  addProperties = jest.fn().mockReturnThis();
  addSensitiveProperties = jest.fn().mockReturnThis();
  setSaveDataRecording = jest.fn().mockReturnThis();
  build = jest.fn().mockReturnThis();
}

describe('useMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(MetricsEventBuilder, 'createEventBuilder')
      .mockImplementation((event) => MockEventDataBuilder.getMockEvent(event));
  });

  it('uses MetaMetrics instance', async () => {
    const { result } = renderHook(() => useMetrics());
    expect(result.current).toMatchInlineSnapshot(`
      {
        "addTraitsToUser": [MockFunction],
        "checkDataDeleteStatus": [MockFunction],
        "createDataDeletionTask": [MockFunction],
        "createEventBuilder": [MockFunction],
        "enable": [MockFunction],
        "getDeleteRegulationCreationDate": [MockFunction],
        "getDeleteRegulationId": [MockFunction],
        "getMetaMetricsId": [MockFunction],
        "isDataRecorded": [MockFunction],
        "isEnabled": [MockFunction],
        "trackEvent": [MockFunction],
      }
    `);
  });

  it('calls MetaMetrics functions', async () => {
    const { result } = renderHook(() => useMetrics());

    const {
      trackEvent,
      enable,
      addTraitsToUser,
      createDataDeletionTask,
      checkDataDeleteStatus,
      getDeleteRegulationCreationDate,
      getDeleteRegulationId,
      isDataRecorded,
      isEnabled,
      createEventBuilder,
    } = result.current;

    const event = createEventBuilder({
      category: 'test event',
    })
      .addProperties({ prop: 'value' })
      .addSensitiveProperties({ secret: 'value' })
      .build();

    let deletionTaskIdValue,
      dataDeleteStatusValue,
      deletionDateValue,
      regulationIdValue,
      isDataRecordedValue,
      isEnabledValue;

    await act(async () => {
      trackEvent(event);
      await enable(true);
      await addTraitsToUser({});
      deletionTaskIdValue = await createDataDeletionTask();
      dataDeleteStatusValue = await checkDataDeleteStatus();
      deletionDateValue = getDeleteRegulationCreationDate();
      regulationIdValue = getDeleteRegulationId();
      isDataRecordedValue = isDataRecorded();
      isEnabledValue = isEnabled();
    });

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(event);
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

    expect(mockMetrics.isEnabled).toHaveBeenCalled();
    expect(isEnabledValue).toBeTruthy();
  });

  it('keeps the same reference to the functions after every call', async () => {
    const {
      result: { current: firstResult },
    } = renderHook(() => useMetrics());
    const {
      result: { current: secondResult },
    } = renderHook(() => useMetrics());

    (Object.keys(firstResult) as (keyof IUseMetricsHook)[]).forEach((key) => {
      expect(firstResult[key]).toBe(secondResult[key]);
    });
  });

  it('keeps the same reference to the whole object on rerenders', async () => {
    const { result, rerender } = renderHook(() => useMetrics());

    const firstRender = result.current;
    rerender();
    const secondRender = result.current;

    // Assert - object reference is the same after re-render
    expect(secondRender).toBe(firstRender);
  });
});
