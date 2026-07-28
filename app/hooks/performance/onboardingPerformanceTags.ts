import { Platform } from 'react-native';

export function getOnboardingPerformanceTags(
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    platform: Platform.OS,
    ...extra,
  };
}
