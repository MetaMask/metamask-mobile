/* eslint-disable no-console */
import Performance from './Performance';
import performance from 'react-native-performance';

jest.mock('../../util/test/utils', () => ({
  isTest: true, // or false, depending on what you want to test
}));

// Mock react-native-performance
jest.mock('react-native-performance', () => {
  const originalModule = jest.requireActual('react-native-performance');
  const entries = [
    { name: 'nativeLaunchEnd', duration: 1500 },
    { name: 'runJsBundleEnd', duration: 1000 },
  ];
  const entriesByName: Record<string, { name: string; duration: number }[]> = {
    nativeLaunch: [{ name: 'nativeLaunch', duration: 1500 }],
    runJsBundle: [{ name: 'runJsBundle', duration: 1000 }],
  };

  return {
    __esModule: true,
    ...originalModule,
    default: {
      measure: jest.fn(),
      getEntriesByName: (name: string) => entriesByName[name],
    },
    PerformanceObserver: jest
      .fn()
      .mockImplementation(
        (
          callback: (list: {
            getEntries: () => { name: string; duration: number }[];
          }) => void,
        ) => ({
          observe: jest.fn().mockImplementation(() => {
            const list = {
              getEntries: () => entries,
            };
            callback(list);
          }),
        }),
      ),
  };
});

describe('Performance', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not log performance numbers in production', () => {
    // Mock console.info to verify its calls
    console.info = jest.fn();

    // Set up performance service
    Performance.setupPerformanceObservers();

    // Verify that performance.measure was called correctly
    expect(performance.measure).toHaveBeenCalledWith(
      'nativeLaunch',
      'nativeLaunchStart',
      'nativeLaunchEnd',
    );
    expect(performance.measure).toHaveBeenCalledWith(
      'runJsBundle',
      'runJsBundleStart',
      'runJsBundleEnd',
    );

    // Verify that console.info was called with expected messages
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(`NATIVE LAUNCH TIME - 1500ms`),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('JS BUNDLE LOAD TIME - 1000ms'),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(
        `APP START TIME = MAX(NATIVE LAUNCH TIME, JS BUNDLE LOAD TIME) - 1500ms`,
      ),
    );
  });
});
