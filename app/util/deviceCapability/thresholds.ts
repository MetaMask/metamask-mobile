export const BYTES_PER_GIB = 1024 ** 3;

// iOS and iPadOS. Comparisons are `<=` because reported RAM is close to nominal.
export const IOS_HARDWARE_THRESHOLDS = {
  LOW_MAX_BYTES: 2 * BYTES_PER_GIB, // ≤ 2 GiB = LOW
  MID_MAX_BYTES: 4 * BYTES_PER_GIB, // ≤ 4 GiB = MID
  // > 4 GiB = HIGH
} as const;

// Android. Comparisons are strict `<` because reported RAM is below nominal.
export const ANDROID_HARDWARE_THRESHOLDS = {
  LOW_BELOW_BYTES: 3 * BYTES_PER_GIB, // < 3 GiB = LOW
  MID_BELOW_BYTES: 5 * BYTES_PER_GIB, // < 5 GiB = MID
  // ≥ 5 GiB = HIGH
} as const;
