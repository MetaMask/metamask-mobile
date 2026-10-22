import type { SharedValue } from 'react-native-reanimated';

export interface PerpsServiceInterruptionBannerProps {
  testID?: string;
  /**
   * Scroll offset of the content beneath the banner. When provided, the
   * description collapses once the user scrolls past a small threshold so the
   * banner only keeps its title row while the content is being read, and
   * expands again when scrolled back to the top.
   */
  scrollY?: SharedValue<number>;
  /**
   * Set on surfaces where the banner is the topmost element on the screen
   * (above a header that would otherwise apply the status-bar inset itself).
   */
  includesTopInset?: boolean;
}
