import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface ComposeArgs {
  state: PressableStateCallbackType;
  callerStyle:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>)
    | undefined;
  disableFeedback: boolean;
  pressedColor: string;
}

/**
 * Layers the design-system pressed overlay on top of the caller's
 * style. The overlay is semi-transparent so it composites over any
 * resting background the caller provides.
 */
export const composePressableStyle = ({
  state,
  callerStyle,
  disableFeedback,
  pressedColor,
}: ComposeArgs): StyleProp<ViewStyle> => {
  const resolvedCaller =
    typeof callerStyle === 'function' ? callerStyle(state) : callerStyle;
  if (!state.pressed || disableFeedback) {
    return resolvedCaller;
  }
  return [resolvedCaller, { backgroundColor: pressedColor }];
};
