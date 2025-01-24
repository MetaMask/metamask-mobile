export const FEATURE_FLAG_NAME = 'mobileMinimumVersions';

// A type predicate's type must be assignable to its parameter's type
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MinimumAppVersionType = {
  appMinimumBuild: number;
  appleMinimumOS: number;
  androidMinimumAPIVersion: number;
}
