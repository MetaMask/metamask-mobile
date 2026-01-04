import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { FpsCounter } from './FpsCounter';

const mockPanGesture = {
  hitSlop: jest.fn().mockReturnThis(),
  onUpdate: jest.fn().mockReturnThis(),
  onEnd: jest.fn().mockReturnThis(),
};

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: jest.requireActual('react-native').View,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: jest.fn(() => mockPanGesture),
  },
}));

jest.mock('react-native-performance-toolkit', () => ({
  BoxedJsFpsTracking: {
    unbox: jest.fn(() => ({
      getJsFpsBuffer: jest.fn(() => {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setInt32(0, 60, true);
        return buffer;
      }),
    })),
  },
}));

describe('FpsCounter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders component tree', () => {
      const { toJSON } = render(<FpsCounter />);

      expect(toJSON()).not.toBeNull();
    });

    it('displays JS FPS label', () => {
      render(<FpsCounter />);

      expect(screen.getByText('JS FPS')).toBeOnTheScreen();
    });

    it('renders non-editable TextInput for FPS display', () => {
      const { UNSAFE_getByType } = render(<FpsCounter />);

      const textInput = UNSAFE_getByType(TextInput);

      expect(textInput.props.editable).toBe(false);
    });

    it('centers TextInput text alignment', () => {
      const { UNSAFE_getByType } = render(<FpsCounter />);

      const textInput = UNSAFE_getByType(TextInput);

      expect(textInput.props.textAlign).toBe('center');
    });

    it('sets TextInput vertical alignment to middle', () => {
      const { UNSAFE_getByType } = render(<FpsCounter />);

      const textInput = UNSAFE_getByType(TextInput);

      expect(textInput.props.verticalAlign).toBe('middle');
    });
  });

  describe('gesture handling', () => {
    it('configures pan gesture with hitSlop of 15', () => {
      render(<FpsCounter />);

      expect(mockPanGesture.hitSlop).toHaveBeenCalledWith(15);
    });

    it('registers onUpdate handler for drag tracking', () => {
      render(<FpsCounter />);

      expect(mockPanGesture.onUpdate).toHaveBeenCalled();
    });

    it('registers onEnd handler for snap behavior', () => {
      render(<FpsCounter />);

      expect(mockPanGesture.onEnd).toHaveBeenCalled();
    });
  });
});
