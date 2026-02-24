import { act, renderHook } from '@testing-library/react-hooks';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  type IDeleteRegulationResponse,
  type IDeleteRegulationStatus,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import type { UseAnalyticsHook } from './useAnalytics.types';

// Unmock to test the real implementation
jest.unmock('./useAnalytics');

// Import after unmocking
const { useAnalytics } = jest.requireActual('./useAnalytics');

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

const buildAnalyticsEvent = (
  saveDataRecording: boolean,
): AnalyticsTrackingEvent => ({
  name: 'test-event',
  properties: {},
  sensitiveProperties: {},
  saveDataRecording,
  get isAnonymous() {
    return false;
  },
  get hasProperties() {
    return false;
  },
});

const createMockEventBuilder = (
  analyticsEvent: AnalyticsTrackingEvent,
): ReturnType<typeof AnalyticsEventBuilder.createEventBuilder> => ({
  addProperties: jest.fn().mockReturnThis(),
  addSensitiveProperties: jest.fn().mockReturnThis(),
  removeProperties: jest.fn().mockReturnThis(),
  removeSensitiveProperties: jest.fn().mockReturnThis(),
  setSaveDataRecording: jest.fn().mockReturnThis(),
  build: jest.fn(() => analyticsEvent),
});

describe('useAnalytics', () => {
  let mockEventBuilder: ReturnType<
    typeof AnalyticsEventBuilder.createEventBuilder
  >;
  let mockAnalyticsEvent: AnalyticsTrackingEvent;

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

    // Set up analytics mock return values
    (
      analytics.isEnabled as jest.MockedFunction<typeof analytics.isEnabled>
    ).mockReturnValue(true);
    (
      analytics.getAnalyticsId as jest.MockedFunction<
        typeof analytics.getAnalyticsId
      >
    ).mockResolvedValue('4d657461-4d61-436b-8e73-46756e212121');

    mockAnalyticsEvent = buildAnalyticsEvent(false);
    mockEventBuilder = createMockEventBuilder(mockAnalyticsEvent);

    jest
      .spyOn(AnalyticsEventBuilder, 'createEventBuilder')
      .mockReturnValue(mockEventBuilder);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('exposes analytics event builder', () => {
    const { result } = renderHook(() => useAnalytics());

    const createEventBuilder = result.current.createEventBuilder;

    expect(createEventBuilder).toBe(AnalyticsEventBuilder.createEventBuilder);
  });

  it('tracks events through analytics', () => {
    const event: AnalyticsTrackingEvent = {
      name: 'test-event',
      properties: {},
      sensitiveProperties: {},
      saveDataRecording: true,
      get isAnonymous() {
        return false;
      },
      get hasProperties() {
        return false;
      },
    };
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.trackEvent(event, false);
    });

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      event,
    );
    expect(mockEventBuilder.setSaveDataRecording).toHaveBeenCalledWith(false);
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockAnalyticsEvent);
  });

  it('updates data recording flag', () => {
    const event: AnalyticsTrackingEvent = {
      name: 'test-event',
      properties: {},
      sensitiveProperties: {},
      saveDataRecording: true,
      get isAnonymous() {
        return false;
      },
      get hasProperties() {
        return false;
      },
    };
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.trackEvent(event, false);
    });

    expect(
      mockAnalyticsDataDeletion.updateDataRecordingFlag,
    ).toHaveBeenCalledWith(false);
  });

  it('calls analytics optIn when enable is true', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.enable(true);
    });

    expect(analytics.optIn).toHaveBeenCalledTimes(1);
  });

  it('calls analytics optOut when enable is false', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.enable(false);
    });

    expect(analytics.optOut).toHaveBeenCalledTimes(1);
  });

  it('calls analytics identify with traits', async () => {
    const userTraits = { test: 'value' };
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.addTraitsToUser(userTraits);
    });

    expect(analytics.identify).toHaveBeenCalledWith(userTraits);
  });

  it('delegates createDataDeletionTask to analyticsDataDeletion', async () => {
    const { result } = renderHook(() => useAnalytics());

    let deletionTask: IDeleteRegulationResponse | undefined;

    await act(async () => {
      deletionTask = await result.current.createDataDeletionTask();
    });

    expect(
      mockAnalyticsDataDeletion.createDataDeletionTask,
    ).toHaveBeenCalledTimes(1);
    expect(deletionTask).toEqual(expectedDataDeletionTaskResponse);
  });

  it('delegates checkDataDeleteStatus to analyticsDataDeletion', async () => {
    const { result } = renderHook(() => useAnalytics());

    let dataDeleteStatus: IDeleteRegulationStatus | undefined;

    await act(async () => {
      dataDeleteStatus = await result.current.checkDataDeleteStatus();
    });

    expect(
      mockAnalyticsDataDeletion.checkDataDeleteStatus,
    ).toHaveBeenCalledTimes(1);
    expect(dataDeleteStatus).toEqual(expectedDataDeleteStatus);
  });

  it('delegates getDeleteRegulationCreationDate to analyticsDataDeletion', () => {
    const { result } = renderHook(() => useAnalytics());

    const deletionDate = result.current.getDeleteRegulationCreationDate();

    expect(
      mockAnalyticsDataDeletion.getDeleteRegulationCreationDate,
    ).toHaveBeenCalledTimes(1);
    expect(deletionDate).toEqual(expectedDate);
  });

  it('delegates getDeleteRegulationId to analyticsDataDeletion', () => {
    const { result } = renderHook(() => useAnalytics());

    const regulationId = result.current.getDeleteRegulationId();

    expect(
      mockAnalyticsDataDeletion.getDeleteRegulationId,
    ).toHaveBeenCalledTimes(1);
    expect(regulationId).toEqual(expectedDataDeleteRegulationId);
  });

  it('delegates isDataRecorded to analyticsDataDeletion', () => {
    const { result } = renderHook(() => useAnalytics());

    const isDataRecordedValue = result.current.isDataRecorded();

    expect(mockAnalyticsDataDeletion.isDataRecorded).toHaveBeenCalledTimes(1);
    expect(isDataRecordedValue).toBe(true);
  });

  it('returns analytics enabled state', () => {
    const { result } = renderHook(() => useAnalytics());

    const enabled = result.current.isEnabled();

    expect(analytics.isEnabled).toHaveBeenCalledTimes(1);
    expect(enabled).toBe(true);
  });

  it('returns analytics id from analytics helper', async () => {
    const { result } = renderHook(() => useAnalytics());

    let analyticsId;
    await act(async () => {
      analyticsId = await result.current.getAnalyticsId();
    });

    expect(analytics.getAnalyticsId).toHaveBeenCalledTimes(1);
    expect(analyticsId).toBe('4d657461-4d61-436b-8e73-46756e212121');
  });

  it('keeps method references across rerenders', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const firstResult = result.current;

    rerender();
    const secondResult = result.current;

    (Object.keys(firstResult) as (keyof UseAnalyticsHook)[]).forEach((key) => {
      expect(firstResult[key]).toBe(secondResult[key]);
    });
  });

  it('keeps hook object reference across rerenders', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const firstRender = result.current;

    rerender();
    const secondRender = result.current;

    expect(secondRender).toBe(firstRender);
  });
});
