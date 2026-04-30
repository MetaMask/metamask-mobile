import { renderHook, act } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics';
import useMetrics from './useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { IUseMetricsHook } from './useMetrics.types';
import { analytics } from '../../../util/analytics/analytics';

const mockAnalyticsDataDeletion = {
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  updateDataRecordingFlag: jest.fn(),
};
jest.mock('../../../util/analytics/analyticsDataDeletion', () => ({
  createDataDeletionTask: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.createDataDeletionTask(...args),
  checkDataDeleteStatus: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.checkDataDeleteStatus(...args),
  getDeleteRegulationCreationDate: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.getDeleteRegulationCreationDate(...args),
  getDeleteRegulationId: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.getDeleteRegulationId(...args),
  isDataRecorded: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.isDataRecorded(...args),
  updateDataRecordingFlag: (...args: unknown[]) =>
    mockAnalyticsDataDeletion.updateDataRecordingFlag(...args),
}));
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
    optIn: jest.fn(() => Promise.resolve()),
    optOut: jest.fn(() => Promise.resolve()),
    identify: jest.fn(() => Promise.resolve()),
    getAnalyticsId: jest.fn(() =>
      Promise.resolve('4d657461-4d61-436b-8e73-46756e212121'),
    ),
    isEnabled: jest.fn(() => true),
  },
}));

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
    mockAnalyticsDataDeletion.createDataDeletionTask.mockResolvedValue(
      expectedDataDeletionTaskResponse,
    );
    mockAnalyticsDataDeletion.checkDataDeleteStatus.mockResolvedValue(
      expectedDataDeleteStatus,
    );
    mockAnalyticsDataDeletion.getDeleteRegulationCreationDate.mockReturnValue(
      expectedDate,
    );
    mockAnalyticsDataDeletion.getDeleteRegulationId.mockReturnValue(
      expectedDataDeleteRegulationId,
    );
    mockAnalyticsDataDeletion.isDataRecorded.mockReturnValue(true);
    jest
      .spyOn(MetricsEventBuilder, 'createEventBuilder')
      .mockImplementation((event) => MockEventDataBuilder.getMockEvent(event));
  });

  it('exposes analytics and data deletion API', async () => {
    const { result } = renderHook(() => useMetrics());
    expect(result.current).toMatchInlineSnapshot(`
      {
        "addTraitsToUser": [Function],
        "checkDataDeleteStatus": [Function],
        "createDataDeletionTask": [Function],
        "createEventBuilder": [MockFunction],
        "enable": [Function],
        "getDeleteRegulationCreationDate": [Function],
        "getDeleteRegulationId": [Function],
        "getMetaMetricsId": [Function],
        "isDataRecorded": [Function],
        "isEnabled": [Function],
        "trackEvent": [Function],
      }
    `);
  });

  it('calls analyticsDataDeletion and analytics functions', async () => {
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

    // trackEvent now converts ITrackingEvent to AnalyticsTrackingEvent and calls analytics.trackEvent
    expect(analytics.trackEvent).toHaveBeenCalled();
    // enable now calls analytics.optIn/optOut
    expect(analytics.optIn).toHaveBeenCalled();
    // addTraitsToUser now calls analytics.identify
    expect(analytics.identify).toHaveBeenCalledWith({});

    expect(mockAnalyticsDataDeletion.createDataDeletionTask).toHaveBeenCalled();
    expect(deletionTaskIdValue).toEqual(expectedDataDeletionTaskResponse);

    expect(mockAnalyticsDataDeletion.checkDataDeleteStatus).toHaveBeenCalled();
    expect(dataDeleteStatusValue).toEqual(expectedDataDeleteStatus);

    expect(
      mockAnalyticsDataDeletion.getDeleteRegulationCreationDate,
    ).toHaveBeenCalled();
    expect(deletionDateValue).toEqual(expectedDate);

    expect(mockAnalyticsDataDeletion.getDeleteRegulationId).toHaveBeenCalled();
    expect(regulationIdValue).toEqual(expectedDataDeleteRegulationId);

    expect(mockAnalyticsDataDeletion.isDataRecorded).toHaveBeenCalled();
    expect(isDataRecordedValue).toEqual(true);

    // isEnabled now calls analytics.isEnabled
    expect(analytics.isEnabled).toHaveBeenCalled();
    expect(isEnabledValue).toBeTruthy();
  });

  it('keeps the same reference to the functions after every call', async () => {
    const { result, rerender } = renderHook(() => useMetrics());
    const firstResult = result.current;

    // Trigger a re-render
    rerender();
    const secondResult = result.current;

    // Functions should maintain reference stability within the same hook instance
    // Note: Different hook instances will have different function references due to useMemo
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
