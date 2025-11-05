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
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';

jest.mock('../../../core/Analytics/MetaMetrics');
jest.mock('../../../contexts/FeatureFlagOverrideContext', () => ({
  useFeatureFlagOverride: jest.fn(),
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

const mockMetrics = {
  trackEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  enableSocialLogin: jest.fn(() => Promise.resolve()),
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

const mockGetFeatureFlagSnapshots = jest.fn();

describe('useMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeatureFlagSnapshots.mockReturnValue({});
    (useFeatureFlagOverride as jest.Mock).mockReturnValue({
      getFeatureFlagSnapshots: mockGetFeatureFlagSnapshots,
      featureFlags: {},
      originalFlags: {},
      getFeatureFlag: jest.fn(),
      featureFlagsList: [],
      overrides: {},
      setOverride: jest.fn(),
      removeOverride: jest.fn(),
      clearAllOverrides: jest.fn(),
      hasOverride: jest.fn(),
      getOverride: jest.fn(),
      getAllOverrides: jest.fn(),
      applyOverrides: jest.fn(),
      getOverrideCount: jest.fn(),
    });
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
        "createEventBuilder": [Function],
        "enable": [MockFunction],
        "enableSocialLogin": [MockFunction],
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
      // createEventBuilder is created with useCallback and depends on context,
      // so it may have different references across different hook instances
      if (key === 'createEventBuilder') {
        expect(typeof firstResult[key]).toBe('function');
        expect(typeof secondResult[key]).toBe('function');
      } else {
        expect(firstResult[key]).toBe(secondResult[key]);
      }
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

  describe('feature flag snapshots integration', () => {
    it('calls getFeatureFlagSnapshots when creating event builder', () => {
      const { result } = renderHook(() => useMetrics());

      result.current.createEventBuilder({
        category: 'test event',
      });

      expect(mockGetFeatureFlagSnapshots).toHaveBeenCalled();
    });

    it('adds feature flag snapshots to event builder via addProperties', () => {
      const mockFeatureFlagSnapshots = {
        relatedFlags: [
          {
            key: 'featureFlag1',
            value: true,
            timestamp: 1234567890,
            type: 'boolean',
            description: 'Test flag 1',
            isOverridden: false,
          },
          {
            key: 'featureFlag2',
            value: 'test-value',
            timestamp: 1234567891,
            type: 'string',
            description: 'Test flag 2',
            isOverridden: true,
          },
        ],
      };
      mockGetFeatureFlagSnapshots.mockReturnValue(mockFeatureFlagSnapshots);
      const { result } = renderHook(() => useMetrics());
      let capturedBuilder: MockEventDataBuilder | undefined;

      jest
        .spyOn(MetricsEventBuilder, 'createEventBuilder')
        .mockImplementation((event) => {
          capturedBuilder = MockEventDataBuilder.getMockEvent(event);
          return capturedBuilder;
        });

      result.current.createEventBuilder({
        category: 'test event',
      });

      expect(mockGetFeatureFlagSnapshots).toHaveBeenCalled();
      expect(capturedBuilder?.addProperties).toHaveBeenCalledWith(
        mockFeatureFlagSnapshots,
      );
    });

    it('adds empty object when getFeatureFlagSnapshots returns empty object', () => {
      mockGetFeatureFlagSnapshots.mockReturnValue({});
      const { result } = renderHook(() => useMetrics());
      let capturedBuilder: MockEventDataBuilder | undefined;

      jest
        .spyOn(MetricsEventBuilder, 'createEventBuilder')
        .mockImplementation((event) => {
          capturedBuilder = MockEventDataBuilder.getMockEvent(event);
          return capturedBuilder;
        });

      result.current.createEventBuilder({
        category: 'test event',
      });

      expect(mockGetFeatureFlagSnapshots).toHaveBeenCalled();
      expect(capturedBuilder?.addProperties).toHaveBeenCalledWith({});
    });

    it('calls getFeatureFlagSnapshots for each createEventBuilder call', () => {
      const { result } = renderHook(() => useMetrics());

      result.current.createEventBuilder({
        category: 'first event',
      });
      result.current.createEventBuilder({
        category: 'second event',
      });

      expect(mockGetFeatureFlagSnapshots).toHaveBeenCalledTimes(2);
    });

    it('includes feature flag snapshots in events with additional properties', () => {
      const mockFeatureFlagSnapshots = {
        relatedFlags: [
          {
            key: 'testFlag',
            value: true,
            timestamp: 1234567890,
            type: 'boolean',
            description: 'Test flag',
            isOverridden: false,
          },
        ],
      };
      mockGetFeatureFlagSnapshots.mockReturnValue(mockFeatureFlagSnapshots);
      const { result } = renderHook(() => useMetrics());
      let capturedBuilder: MockEventDataBuilder | undefined;

      jest
        .spyOn(MetricsEventBuilder, 'createEventBuilder')
        .mockImplementation((event) => {
          capturedBuilder = MockEventDataBuilder.getMockEvent(event);
          return capturedBuilder;
        });

      result.current
        .createEventBuilder({
          category: 'test event',
        })
        .addProperties({ customProp: 'customValue' });

      expect(capturedBuilder?.addProperties).toHaveBeenCalledWith(
        mockFeatureFlagSnapshots,
      );
    });
  });
});
