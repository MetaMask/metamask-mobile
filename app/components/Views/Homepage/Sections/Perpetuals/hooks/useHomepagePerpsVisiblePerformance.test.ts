import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useHomepagePerpsVisiblePerformanceDev } from './useHomepagePerpsVisiblePerformance';

const mockRelease = jest.fn();
const mockRecordVisible = jest.fn();
const mockRecordError = jest.fn((_input: unknown) => undefined);
const mockMarkComplete = jest.fn((_demand: unknown) => undefined);
const mockLifecycleListeners: (() => void)[] = [];
let mockIsFocused = true;

const demand = {
  demandId: 'demand-1',
  startedAtMonotonicMs: 0,
  lifecycleStartedAtMonotonicMs: 0,
  lifecycle: 'cold_no_cache' as const,
  accountGeneration: 0,
  contextGeneration: 0,
  firstVisibleRecorded: false,
  firstFreshVisibleRecorded: false,
};

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('../../../hooks/useSectionViewportVisible', () => () => ({
  isVisible: true,
  onLayout: jest.fn(),
}));

jest.mock('../../../../../UI/Perps/utils/homepagePerformanceProbe', () => ({
  activateHomepagePerformanceProbe: () => mockRelease,
  createHomepagePerformanceDemand: () => ({ ...demand }),
  createHomepagePerpsResidentDelivery: ({
    stream,
    itemCount,
  }: {
    stream: string;
    itemCount: number;
  }) => ({
    deliveryId: `resident-${stream}`,
    stream,
    source: 'resident_state',
    itemCount,
    receivedAtMonotonicMs: 0,
    dataAgeMs: 0,
    lifecycle: 'cold_no_cache',
    accountGeneration: 0,
    contextGeneration: 0,
  }),
  handleHomepagePerformanceAppStateChange: jest.fn(),
  isHomepagePerpsDeliveryFreshForDemand: () => false,
  logHomepagePerformanceStage: jest.fn(),
  markHomepagePerformanceDemandComplete: (input: unknown) =>
    mockMarkComplete(input),
  markHomepagePerpsNavigateReturn: jest.fn(),
  recordHomepagePerpsErrorFrame: (input: unknown) => mockRecordError(input),
  recordHomepagePerpsVisibleFrame: (input: unknown) => mockRecordVisible(input),
  subscribeHomepagePerformanceLifecycleChange: (listener: () => void) => {
    mockLifecycleListeners.push(listener);
    return jest.fn();
  },
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: jest.fn(() => 100) },
}));

describe('useHomepagePerpsVisiblePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLifecycleListeners.length = 0;
    mockIsFocused = true;
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
  });

  it('requires account metadata in the visible delivery bundle', () => {
    renderHook(() =>
      useHomepagePerpsVisiblePerformanceDev({
        sectionRef: { current: null },
        willRender: true,
        hasConnectionError: false,
        contentVariant: 'trending',
        itemCount: 1,
        positionsCount: 0,
        ordersCount: 0,
        accountResolved: true,
        marketsCount: 1,
        marketsDelivery: {
          deliveryId: 'markets-1',
          stream: 'markets',
          source: 'provider',
          itemCount: 1,
          receivedAtMonotonicMs: 1,
          dataAgeMs: 0,
          lifecycle: 'cold_no_cache',
          accountGeneration: 0,
          contextGeneration: 0,
        },
      }),
    );

    expect(mockRecordVisible).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveries: expect.arrayContaining([
          expect.objectContaining({ stream: 'positions' }),
          expect.objectContaining({ stream: 'orders' }),
          expect.objectContaining({ stream: 'account' }),
          expect.objectContaining({ stream: 'markets' }),
        ]),
      }),
    );
  });

  it('releases observation when Homepage loses focus', () => {
    const { rerender } = renderHook(() =>
      useHomepagePerpsVisiblePerformanceDev({
        sectionRef: { current: null },
        willRender: true,
        hasConnectionError: false,
        contentVariant: 'trending',
        itemCount: 0,
        positionsCount: 0,
        ordersCount: 0,
        accountResolved: false,
      }),
    );

    mockIsFocused = false;
    act(() => rerender(undefined));

    expect(mockRelease).toHaveBeenCalled();
  });
});
