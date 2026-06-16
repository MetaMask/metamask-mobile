import { Animated } from 'react-native';
import { CarouselSlide } from '../types';

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
  onSlideClick: (slide: CarouselSlide) => void;
  onTransitionToNextCard?: () => void;
}
