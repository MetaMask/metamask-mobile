/* eslint-disable no-console */
import performance, { PerformanceObserver } from 'react-native-performance';
import StorageWrapper from '../../store/storage-wrapper';
import { isTest } from '../../util/test/utils';

/**
 * Service for measuring app performance
 */

async function setPerformanceValues(appStartTime: number) {
  await StorageWrapper.setItem('appStartTime', appStartTime.toString());
}

class Performance {
  /**
   * Measures app start and JS bundle loading times
   */
  static setupPerformanceObservers = () => {
    // Don't run in release mode
    if (!isTest) return;

    new PerformanceObserver((list) => {
      // Get measurement entries
      const entries = list.getEntries();

      if (entries.find((entry) => entry.name === 'runJsBundleEnd')) {
        // Measure app start
        performance.measure(
          'nativeLaunch',
          'nativeLaunchStart',
          'nativeLaunchEnd',
        );
        // Measure JS bundle load
        performance.measure(
          'runJsBundle',
          'runJsBundleStart',
          'runJsBundleEnd',
        );
        // Retrieve the measurements
        const nativeLaunchEntry = performance.getEntriesByName('nativeLaunch');
        const runJsBundleEntry = performance.getEntriesByName('runJsBundle');

        // Get the duration
        const nativeLaunchDuration = nativeLaunchEntry[0].duration;
        const jsBundleDuration = runJsBundleEntry[0].duration;
        // Assuming JS bundle loads in parallel with launch start
        // the total app start time is then the maximum of the two durations
        const appStartTime = Math.max(nativeLaunchDuration, jsBundleDuration);

        // eslint-disable-next-line no-console
        console.info(`-------------------------------------------------------`);
        console.info(`---------------🕙 PERFORMANCE NUMBERS 🕙---------------`);
        console.info(`-------------------------------------------------------`);
        console.info(`NATIVE LAUNCH TIME - ${nativeLaunchDuration}ms`);
        console.info(`JS BUNDLE LOAD TIME - ${jsBundleDuration}ms`);
        console.info(
          `APP START TIME = MAX(NATIVE LAUNCH TIME, JS BUNDLE LOAD TIME) - ${appStartTime}ms`,
        );
        console.info(`-------------------------------------------------------`);
        console.info(`-------------------------------------------------------`);

        setPerformanceValues(appStartTime);

      }
    }).observe({ type: 'react-native-mark', buffered: true });
  };
}

export default Performance;
