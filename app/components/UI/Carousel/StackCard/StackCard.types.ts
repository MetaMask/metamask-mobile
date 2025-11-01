import { Animated } from 'react-native';
import { CarouselSlide, NavigationAction } from '../types';

export interface StackCardProps {
  slide: CarouselSlide;
  isCurrentCard: boolean;
  currentCardOpacity: Animated.Value;
  currentCardScale: Animated.Value;
  currentCardTranslateY: Animated.Value;
  nextCardOpacity: Animated.Value;
  nextCardScale: Animated.Value;
  nextCardTranslateY: Animated.Value;
  nextCardBgOpacity: Animated.Value;
  onSlideClick: (slideId: string, navigation: NavigationAction) => void;
  onTransitionToNextCard?: () => void;
  onTransitionToEmpty?: () => void;
}
