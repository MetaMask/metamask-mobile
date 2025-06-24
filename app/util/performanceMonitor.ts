import { NativeModules } from 'react-native';

export async function setPerformanceMonitoringEnabled(enabled: boolean): Promise<void> {
  const fdm = NativeModules.FpsDebugModule;
  console.log(`Setting performance monitor visible to ${enabled}`);
  await fdm.setFpsDebugEnabled(enabled);
  const isEnabled = await fdm.isFpsDebugEnabled();
  console.log('Performance monitor set to:', isEnabled);
}
