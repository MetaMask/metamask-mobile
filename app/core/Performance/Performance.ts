/* eslint-disable no-console */
import performance, { PerformanceObserver } from 'react-native-performance';
import StorageWrapper from '../../store/storage-wrapper';
import { TraceName, TraceOperation, endTrace, trace } from '../../util/trace';
import getUIStartupSpan from './UIStartup';
import {
  isE2EOrExpEnvironment,
  isTestEnvironment,
} from '../../util/test/utils';

/**
 * Service for measuring app performance
 */

async function setPerformanceValues(appStartTime: number) {
  await StorageWrapper.setItem('appStartTime', appStartTime.toString());
}

class Performance {
  static appLaunchTime: number;
  /**
   * Measures app start and JS bundle loading times
   */
  static setupPerformanceObservers = () => {
    new PerformanceObserver((list) => {
      // Get measurement entries
      const entries = list.getEntries();

      if (entries.find((entry) => entry.name === 'runJsBundleEnd')) {
        // On hot reload under RN 0.83 bridgeless, `runJsBundleStart` is dropped
        // while `runJsBundleEnd` still fires (StartupLogger reset cascade,
        // facebook/react-native#56339). `performance.measure` throws on the
        // missing mark, so skip this startup telemetry when it's absent.
        // Note: native startup marks are emitted as `react-native-mark` entries,
        // not `mark`, so the name lookup must NOT filter by entry type — that's
        // the same set of marks `performance.measure` resolves against.
        if (performance.getEntriesByName('runJsBundleStart').length === 0) {
          return;
        }
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
        // Measure the whole pre-JS window in one span. `Math.max` of the two
        // phases below was used here previously, on the assumption that native
        // launch and JS bundle load overlap. They do not: measured on a
        // Galaxy A14 (production release), `nativeLaunchEnd` precedes
        // `runJsBundleStart` with 0 ms of overlap, and there is a further
        // ~589 ms of React Native host/context setup between them that neither
        // phase covers. Taking the max therefore under-reported app start by
        // ~642 ms and made that gap permanently invisible.
        performance.measure('appStart', 'nativeLaunchStart', 'runJsBundleEnd');

        // Retrieve the measurements
        const nativeLaunchEntry = performance.getEntriesByName('nativeLaunch');
        const runJsBundleEntry = performance.getEntriesByName('runJsBundle');
        const appStartEntry = performance.getEntriesByName('appStart');

        // Get the duration
        const nativeLaunchDuration = nativeLaunchEntry[0].duration;
        const jsBundleDuration = runJsBundleEntry[0].duration;
        const appStartTime = appStartEntry[0].duration;

        if (isTestEnvironment || isE2EOrExpEnvironment) {
          // eslint-disable-next-line no-console
          console.info(
            `-------------------------------------------------------`,
          );
          console.info(
            `---------------🕙 PERFORMANCE NUMBERS 🕙---------------`,
          );
          console.info(
            `-------------------------------------------------------`,
          );
          console.info(`NATIVE LAUNCH TIME - ${nativeLaunchDuration}ms`);
          console.info(`JS BUNDLE LOAD TIME - ${jsBundleDuration}ms`);
          console.info(
            `APP START TIME = nativeLaunchStart -> runJsBundleEnd - ${appStartTime}ms`,
          );
          console.info(
            `-------------------------------------------------------`,
          );
          console.info(
            `-------------------------------------------------------`,
          );

          setPerformanceValues(appStartTime);
        }
        const now = Date.now();

        const appLaunchTime = now - appStartTime;
        this.appLaunchTime = appLaunchTime;

        const parentSpan = getUIStartupSpan(appLaunchTime);

        trace({
          name: TraceName.LoadScripts,
          startTime: appLaunchTime,
          parentContext: parentSpan,
          op: TraceOperation.LoadScripts,
        });
        endTrace({
          name: TraceName.LoadScripts,
          timestamp: now,
        });
      }
    }).observe({ type: 'react-native-mark', buffered: true });
  };
}

export default Performance;
