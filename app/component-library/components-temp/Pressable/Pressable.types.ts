import type { PressableProps as RNPressableProps } from 'react-native';
import type { PressableProps as RNGHPressableProps } from 'react-native-gesture-handler';

interface FeedbackProps {
  /**
   * Suppress the pressed-state overlay. Use for surfaces that are
   * pressable but intentionally show no press feedback (backdrops,
   * dismiss overlays, invisible hit targets — i.e. the old
   * `activeOpacity={1}` cases).
   * @default false
   */
  disableFeedback?: boolean;
}

export interface PressableProps
  extends FeedbackProps,
    Omit<RNPressableProps, 'style'> {
  /**
   * Style merged on top of (or under) the pressed overlay. Accepts
   * either a static style or the standard `({ pressed }) => style`
   * callback form.
   */
  style?: RNPressableProps['style'];
}

export interface PressableGHProps
  extends FeedbackProps,
    Omit<RNGHPressableProps, 'style'> {
  /**
   * Style merged on top of (or under) the pressed overlay. Accepts
   * either a static style or the standard `({ pressed }) => style`
   * callback form.
   */
  style?: RNGHPressableProps['style'];
}
