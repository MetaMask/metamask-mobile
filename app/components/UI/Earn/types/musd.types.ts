export enum MUSD_CONVERSION_NAVIGATION_OVERRIDE {
  QUICK_CONVERT = 'quickConvert',
  CUSTOM = 'custom',
}

/**
 * Pure-navigation target used by the education gate. When present, the
 * education screen's primary button routes here instead of continuing
 * the conversion flow.
 */
export interface MusdNavigationTarget {
  screen: string;
  params?: Record<string, unknown>;
}
