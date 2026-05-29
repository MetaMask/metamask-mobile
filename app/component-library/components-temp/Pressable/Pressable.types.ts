import type { PressableProps as RNPressableProps } from 'react-native';
import type { PressableProps as RNGHPressableProps } from 'react-native-gesture-handler';

/**
 * Visual feedback applied on press.
 *
 * `Default` dims the caller's subtree (matches the legacy `TouchableOpacity`
 * behaviour with a gentler opacity that keeps content visible under
 * pure-black mode). Use for the broad majority of touchable surfaces.
 *
 * `Highlight` composites the semantic `background.pressed` token over the
 * caller's resting surface. Use for list rows, settings rows, and other
 * surfaces where a backdrop highlight is the established design pattern.
 */
export const PressableVariant = {
  Default: 'default',
  Highlight: 'highlight',
} as const;

export type PressableVariant =
  (typeof PressableVariant)[keyof typeof PressableVariant];

export type PressableProps = RNPressableProps & {
  variant?: PressableVariant;
};

export type PressableGHProps = RNGHPressableProps & {
  variant?: PressableVariant;
};
