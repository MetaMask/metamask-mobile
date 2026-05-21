import type { PressableProps as RNPressableProps } from 'react-native';
import type { PressableProps as RNGHPressableProps } from 'react-native-gesture-handler';

/**
 * Semantic surface variant. The variant determines both the resting
 * background color and the matching pressed color so callers don't have
 * to pick token pairs themselves.
 *
 * See `./README.md` for the full variant → token mapping.
 */
export type PressableVariant =
  | 'section'
  | 'subsection'
  | 'default'
  | 'muted'
  | 'none'
  | 'transparent';

interface VariantProps {
  /**
   * Surface variant. Determines resting + pressed background colors.
   * @default 'none'
   */
  variant?: PressableVariant;
}

export interface PressableProps
  extends VariantProps,
    Omit<RNPressableProps, 'style'> {
  /**
   * Additional style merged on top of the variant background. Receives
   * `{ pressed }` so callers can layer their own pressed styles.
   */
  style?: RNPressableProps['style'];
}

export interface PressableGHProps
  extends VariantProps,
    Omit<RNGHPressableProps, 'style'> {
  /**
   * Additional style merged on top of the variant background. Receives
   * `{ pressed }` so callers can layer their own pressed styles.
   */
  style?: RNGHPressableProps['style'];
}
