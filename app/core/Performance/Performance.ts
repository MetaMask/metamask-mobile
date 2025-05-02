/* eslint-disable no-console */
import StorageWrapper from '../../store/storage-wrapper';
import { TraceName, TraceOperation, endTrace, trace } from '../../util/trace';
import getUIStartupSpan from './UIStartup';
import { isTest } from '../../util/test/utils';

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
    return;
  };
}

export default Performance;
