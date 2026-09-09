/* eslint-disable no-console */
import Performance from './Performance';
import performance, { PerformanceObserver } from 'react-native-performance';

jest.mock('../../util/test/utils', () => ({
  isTestEnvironment: true,
  isE2EOrExpEnvironment: true,
}));

// Mock react-native-performance
jest.mock('react-native-performance', () => {
  const originalModule = jest.requireActual('react-native-performance');

  return {
    __esModule: true,
    ...originalModule,
    default: {
      measure: jest.fn(),
      getEntriesByName: jest.fn(),
      // `endTrace` reaches `getPerformanceTimestamp`, which reads both of
      // these. Without them the observer callback throws before any assertion
      // runs, and which test sees it depends on trace-buffer ordering.
      now: jest.fn(() => 0),
      timeOrigin: 0,
    },
    PerformanceObserver: jest.fn(),
  };
});

interface MockEntry {
  name: string;
  duration: number;
}

const mockedPerformance = performance as unknown as {
  measure: jest.Mock;
  getEntriesByName: jest.Mock;
};
const MockedPerformanceObserver = PerformanceObserver as unknown as jest.Mock;

/**
 * Wires the mocked PerformanceObserver so that calling `observe` synchronously
 * invokes the callback with the provided startup-mark entries, mirroring the
 * `buffered: true` behaviour used by the implementation.
 */
const setupObserverWithEntries = (entries: MockEntry[]) => {
  MockedPerformanceObserver.mockImplementation(
    (callback: (list: { getEntries: () => MockEntry[] }) => void) => ({
      observe: jest.fn(() => callback({ getEntries: () => entries })),
    }),
  );
};

describe('Performance', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('measures startup timings and logs performance numbers on cold start', () => {
    // Arrange
    console.info = jest.fn();
    setupObserverWithEntries([
      { name: 'nativeLaunchEnd', duration: 1500 },
      { name: 'runJsBundleEnd', duration: 1000 },
    ]);
    const entriesByName: Record<string, MockEntry[]> = {
      runJsBundleStart: [{ name: 'runJsBundleStart', duration: 0 }],
      nativeLaunch: [{ name: 'nativeLaunch', duration: 1500 }],
      runJsBundle: [{ name: 'runJsBundle', duration: 1000 }],
      appStart: [{ name: 'appStart', duration: 3100 }],
    };
    mockedPerformance.getEntriesByName.mockImplementation(
      (name: string) => entriesByName[name] ?? [],
    );

    // Act
    Performance.setupPerformanceObservers();

    // Assert
    expect(mockedPerformance.measure).toHaveBeenCalledWith(
      'nativeLaunch',
      'nativeLaunchStart',
      'nativeLaunchEnd',
    );
    expect(mockedPerformance.measure).toHaveBeenCalledWith(
      'runJsBundle',
      'runJsBundleStart',
      'runJsBundleEnd',
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(`NATIVE LAUNCH TIME - 1500ms`),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('JS BUNDLE LOAD TIME - 1000ms'),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(
        `APP START TIME = nativeLaunchStart -> runJsBundleEnd - 3100ms`,
      ),
    );
  });

  it('spans nativeLaunchStart to runJsBundleEnd so the host-setup gap is counted', () => {
    // Arrange: the two phases are sequential, not overlapping, and there is a
    // further host/context-setup gap between them. `appStart` (3100ms) is
    // therefore larger than either phase and larger than their max (1500ms) —
    // taking the max would silently discard the gap.
    console.info = jest.fn();
    setupObserverWithEntries([{ name: 'runJsBundleEnd', duration: 1000 }]);
    const entriesByName: Record<string, MockEntry[]> = {
      runJsBundleStart: [{ name: 'runJsBundleStart', duration: 0 }],
      nativeLaunch: [{ name: 'nativeLaunch', duration: 1500 }],
      runJsBundle: [{ name: 'runJsBundle', duration: 1000 }],
      appStart: [{ name: 'appStart', duration: 3100 }],
    };
    mockedPerformance.getEntriesByName.mockImplementation(
      (name: string) => entriesByName[name] ?? [],
    );

    // Act
    Performance.setupPerformanceObservers();

    // Assert
    expect(mockedPerformance.measure).toHaveBeenCalledWith(
      'appStart',
      'nativeLaunchStart',
      'runJsBundleEnd',
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('APP START TIME'),
    );
    // The reported app start must be the full span, not the larger phase.
    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'APP START TIME = nativeLaunchStart -> runJsBundleEnd - 1500ms',
      ),
    );
  });

  it('skips measuring without throwing when runJsBundleStart is missing (hot reload)', () => {
    // Arrange: RN 0.83 bridgeless hot reload drops `runJsBundleStart` while
    // `runJsBundleEnd` still fires (facebook/react-native#56339).
    console.info = jest.fn();
    setupObserverWithEntries([{ name: 'runJsBundleEnd', duration: 1000 }]);
    mockedPerformance.getEntriesByName.mockImplementation((name: string) =>
      name === 'runJsBundleStart' ? [] : [{ name, duration: 0 }],
    );

    // Act & Assert
    expect(() => Performance.setupPerformanceObservers()).not.toThrow();
    expect(mockedPerformance.measure).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });
});
