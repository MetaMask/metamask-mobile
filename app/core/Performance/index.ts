import Performance from './Performance';

export { Performance };
export {
  getLastAppProfilePath,
  isAppProfilingRecording,
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
} from './appProfiling';
export { registerPerformanceProfilerBridge } from './performanceProfilerBridge';
