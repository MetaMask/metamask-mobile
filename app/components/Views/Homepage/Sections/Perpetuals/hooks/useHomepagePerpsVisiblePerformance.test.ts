import { renderHook } from '@testing-library/react-native';
import { useHomepagePerpsVisiblePerformance } from './useHomepagePerpsVisiblePerformance';
import type {
  HomepagePerformanceDemand,
  HomepagePerpsDeliveryMetadata,
} from '../../../../../UI/Perps/utils/homepagePerformanceProbe';

const mockRemoveAppStateListener = jest.fn();

let mockIsVisible = true;
let mockIsFocused = true;
const mockOnLayout = jest.fn();
let mockLifecycleListener: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => mockIsFocused),
}));

jest.mock('../../../hooks/useSectionViewportVisible', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isVisible: mockIsVisible,
    onLayout: mockOnLayout,
  })),
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: jest.fn(() => 200) },
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      ...actual.AppState,
      addEventListener: jest.fn(() => ({ remove: mockRemoveAppStateListener })),
    },
  };
});

jest.mock('../../../../../UI/Perps/utils/homepagePerformanceProbe', () => ({
  createHomepagePerformanceDemand: jest.fn(),
  createHomepagePerpsResidentDelivery: jest.fn(),
  handleHomepagePerformanceAppStateChange: jest.fn(),
  isHomepagePerpsDeliveryFreshForDemand: jest.fn(() => true),
  logHomepagePerformanceStage: jest.fn(),
  markHomepagePerformanceFrameComplete: jest.fn(),
  markHomepagePerpsNavigateReturn: jest.fn(() => mockLifecycleListener?.()),
  recordHomepagePerpsErrorFrame: jest.fn(),
  recordHomepagePerpsVisibleFrame: jest.fn(),
  subscribeHomepagePerformanceLifecycleChange: jest.fn(
    (listener: () => void) => {
      mockLifecycleListener = listener;
      return jest.fn();
    },
  ),
}));

const performanceProbe = jest.requireMock(
  '../../../../../UI/Perps/utils/homepagePerformanceProbe',
);

const demand: HomepagePerformanceDemand = {
  demandId: 'demand-1',
  startedAtMonotonicMs: 100,
  lifecycleStartedAtMonotonicMs: 0,
  lifecycle: 'cold_disk_cache',
  firstVisibleRecorded: false,
  firstFreshVisibleRecorded: false,
  recordedFreshPipelineStreams: new Set(),
};

const delivery = (
  stream: 'positions' | 'orders',
): HomepagePerpsDeliveryMetadata => ({
  deliveryId: `${stream}-1`,
  stream,
  source: 'fresh_socket',
  itemCount: 0,
  receivedAtMonotonicMs: 120,
  subscriberDeliveredAtMonotonicMs: 130,
  dataAgeMs: 0,
  lifecycle: 'cold_disk_cache',
  accountGeneration: 0,
});

describe('useHomepagePerpsVisiblePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVisible = true;
    mockIsFocused = true;
    mockLifecycleListener = undefined;
    performanceProbe.createHomepagePerformanceDemand.mockReturnValue(demand);
    performanceProbe.createHomepagePerpsResidentDelivery.mockImplementation(
      ({
        stream,
        itemCount,
        previousDelivery,
      }: {
        stream: 'positions' | 'orders';
        itemCount: number;
        previousDelivery?: HomepagePerpsDeliveryMetadata;
      }) => ({
        ...delivery(stream),
        deliveryId: `${stream}-resident`,
        source: 'resident_state',
        itemCount,
        receivedAtMonotonicMs: previousDelivery?.receivedAtMonotonicMs ?? 100,
      }),
    );
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('records already-present deliveries as resident state at the visible frame checkpoint', () => {
    const positionsDelivery = delivery('positions');
    const ordersDelivery = delivery('orders');

    const { result } = renderHook(() =>
      useHomepagePerpsVisiblePerformance({
        willRender: true,
        hasConnectionError: false,
        contentVariant: 'empty',
        itemCount: 0,
        positionsCount: 0,
        ordersCount: 0,
        positionsDelivery,
        ordersDelivery,
      }),
    );

    expect(result.current.onContentViewportLayout).toBe(mockOnLayout);
    expect(
      performanceProbe.recordHomepagePerpsVisibleFrame,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        demand,
        deliveries: [
          expect.objectContaining({
            stream: 'positions',
            source: 'resident_state',
          }),
          expect.objectContaining({
            stream: 'orders',
            source: 'resident_state',
          }),
        ],
        contentVariant: 'empty',
      }),
    );
    expect(
      performanceProbe.logHomepagePerformanceStage,
    ).not.toHaveBeenCalledWith(
      'react_commit',
      positionsDelivery,
      expect.anything(),
    );
  });

  it('creates only one replacement demand when returning to Home', () => {
    mockIsFocused = false;
    const { rerender } = renderHook(() =>
      useHomepagePerpsVisiblePerformance({
        willRender: true,
        hasConnectionError: false,
        contentVariant: 'orders',
        itemCount: 1,
        positionsCount: 0,
        ordersCount: 1,
        positionsDelivery: delivery('positions'),
        ordersDelivery: delivery('orders'),
      }),
    );

    expect(
      performanceProbe.createHomepagePerformanceDemand,
    ).toHaveBeenCalledTimes(1);
    mockIsFocused = true;
    rerender({});

    expect(
      performanceProbe.markHomepagePerpsNavigateReturn,
    ).toHaveBeenCalledTimes(1);
    expect(
      performanceProbe.createHomepagePerformanceDemand,
    ).toHaveBeenCalledTimes(2);
  });

  it('does not start or record a demand while outside the viewport', () => {
    mockIsVisible = false;

    renderHook(() =>
      useHomepagePerpsVisiblePerformance({
        willRender: true,
        hasConnectionError: false,
        contentVariant: 'empty',
        itemCount: 0,
        positionsCount: 0,
        ordersCount: 0,
        positionsDelivery: delivery('positions'),
        ordersDelivery: delivery('orders'),
      }),
    );

    expect(
      performanceProbe.createHomepagePerformanceDemand,
    ).not.toHaveBeenCalled();
    expect(
      performanceProbe.recordHomepagePerpsVisibleFrame,
    ).not.toHaveBeenCalled();
  });

  it('records a visible connection error as an unsuccessful outcome', () => {
    renderHook(() =>
      useHomepagePerpsVisiblePerformance({
        willRender: true,
        hasConnectionError: true,
        contentVariant: 'error',
        itemCount: 0,
        positionsCount: 0,
        ordersCount: 0,
      }),
    );

    expect(performanceProbe.recordHomepagePerpsErrorFrame).toHaveBeenCalledWith(
      expect.objectContaining({ demand }),
    );
  });
});
