import performance, { PerformanceObserver } from 'react-native-performance';

const setupPerformanceObservers = (setAppStartTime) => {
  new PerformanceObserver((list, observer) => {
    const entries = list.getEntries();
    if (entries.find((entry) => entry.name === 'runJsBundleEnd')) {
      performance.measure(
        'nativeLaunch',
        'nativeLaunchStart',
        'nativeLaunchEnd',
      );
      performance.measure('runJsBundle', 'runJsBundleStart', 'runJsBundleEnd');

      // Retrieve the measurements
      const nativeLaunch = performance.getEntriesByName('nativeLaunch');
      const runJsBundle = performance.getEntriesByName('runJsBundle');
      const maxTime = Math.max(
        nativeLaunch[0].startTime,
        runJsBundle[0].startTime,
      );

      setAppStartTime(maxTime);
    }
  }).observe({ type: 'react-native-mark', buffered: true });
};

export default setupPerformanceObservers;
