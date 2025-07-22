import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

// Mock dependencies - only what's absolutely necessary
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  GestureDetector: 'View',
  Gesture: {
    Pan: jest.fn().mockReturnValue({
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
    Tap: jest.fn().mockReturnValue({
      onEnd: jest.fn().mockReturnThis(),
    }),
    Simultaneous: jest.fn(),
  },
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('PerpsLeverageBottomSheet', () => {
  const defaultProps = {
    isVisible: false,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    leverage: 5,
    minLeverage: 1,
    maxLeverage: 20,
    currentPrice: 3000,
    liquidationPrice: 2850,
    direction: 'long' as const,
  };

  it('should render without crashing', () => {
    const component = render(<PerpsLeverageBottomSheet {...defaultProps} />);
    expect(component).toBeDefined();
  });
});
