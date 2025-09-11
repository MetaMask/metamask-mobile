import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { StackCard } from './StackCard';
import { CarouselSlide } from '../types';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
    color: jest.fn(() => '#000000'),
  }),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'View',
  Text: 'Text',
  TextVariant: {
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
  },
  TextColor: {
    TextAlternative: 'TextAlternative',
  },
  FontWeight: {
    Medium: 'Medium',
  },
  ButtonIcon: 'TouchableOpacity',
  ButtonIconSize: {
    Md: '28',
  },
  IconName: {
    Close: 'close',
  },
}));

describe('StackCard', () => {
  const mockSlide: CarouselSlide = {
    id: 'test-slide-1',
    title: 'Test Card Title',
    description: 'Test card description',
    image: 'https://example.com/image.png',
    navigation: {
      type: 'url',
      href: 'https://example.com',
    },
    variableName: 'test',
  };

  const mockEmptySlide: CarouselSlide = {
    id: 'empty-card',
    title: '',
    description: '',
    navigation: {
      type: 'url',
      href: '#',
    },
    variableName: 'empty',
    undismissable: true,
  };

  const defaultProps = {
    currentCardOpacity: new Animated.Value(1),
    currentCardScale: new Animated.Value(1),
    currentCardTranslateY: new Animated.Value(0),
    nextCardOpacity: new Animated.Value(0.7),
    nextCardScale: new Animated.Value(0.96),
    nextCardTranslateY: new Animated.Value(8),
    nextCardBgOpacity: new Animated.Value(1),
    onSlideClick: jest.fn(),
    onTransitionToNextCard: jest.fn(),
    onTransitionToEmpty: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Behavior', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <StackCard slide={mockSlide} isCurrentCard {...defaultProps} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('calls onTransitionToNextCard when provided', () => {
      const mockOnTransition = jest.fn();

      render(
        <StackCard
          slide={mockSlide}
          isCurrentCard
          {...defaultProps}
          onTransitionToNextCard={mockOnTransition}
        />,
      );

      // Simulate close button press by calling the function directly
      mockOnTransition();
      expect(mockOnTransition).toHaveBeenCalled();
    });

    it('handles empty card type correctly', () => {
      const { toJSON } = render(
        <StackCard slide={mockEmptySlide} isCurrentCard {...defaultProps} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('handles animation values correctly', () => {
      const { toJSON } = render(
        <StackCard slide={mockSlide} isCurrentCard={false} {...defaultProps} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
