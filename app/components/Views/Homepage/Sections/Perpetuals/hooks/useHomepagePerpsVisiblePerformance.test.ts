import { renderHook } from '@testing-library/react-native';
import { useHomepagePerpsVisiblePerformance } from './useHomepagePerpsVisiblePerformance';
import type {
  HomepagePerformanceDemand,
  HomepagePerpsDeliveryMetadata,
} from '../../../../../UI/Perps/utils/homepagePerformanceProbe';

const mockRemoveAppStateListener = jest.fn();

let mockIsVisible = true;
const mockOnLayout = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
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
  logHomepagePerformanceStage: jest.fn(),
  markHomepagePerformanceFrameComplete: jest.fn(),
  markHomepagePerpsNavigateReturn: jest.fn(),
  recordHomepagePerpsErrorFrame: jest.fn(),
  recordHomepagePerpsVisibleFrame: jest.fn(),
  subscribeHomepagePerformanceLifecycleChange: jest.fn(() => jest.fn()),
}));

const performanceProbe = jest.requireMock(
  '../../../../../UI/Perps/utils/homepagePerformanceProbe',
);

const demand: HomepagePerformanceDemand = {
  demandId: 'demand-1',
  startedAtMonotonicMs: 100,
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
    performanceProbe.createHomepagePerformanceDemand.mockReturnValue(demand);
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('records fresh deliveries after the visible frame checkpoint', () => {
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
        deliveries: [positionsDelivery, ordersDelivery],
        contentVariant: 'empty',
      }),
    );
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
