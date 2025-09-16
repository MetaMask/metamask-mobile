import { Animated } from 'react-native';

export interface StackCardEmptyProps {
  emptyStateOpacity: Animated.Value;
  emptyStateScale: Animated.Value;
  emptyStateTranslateY: Animated.Value;
  nextCardBgOpacity: Animated.Value;
  onTransitionToEmpty?: () => void;
}
