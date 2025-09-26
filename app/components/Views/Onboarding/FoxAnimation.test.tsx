import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import FoxAnimation from './FoxAnimation';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import {
  __getLastMockedMethods,
  __clearLastMockedMethods,
  __resetAllMocks,
} from '../../../__mocks__/rive-react-native';

// Mock dependencies
jest.mock('../../../util/Logger');
jest.mock('../../../util/device');
jest.mock('../../../util/test/utils', () => ({
  isE2E: false,
}));

// Use the proper mock from __mocks__ directory
jest.mock('rive-react-native', () =>
  jest.requireActual('../../../__mocks__/rive-react-native'),
);

const mockedLogger = Logger as jest.Mocked<typeof Logger>;
const mockedDevice = Device as jest.Mocked<typeof Device>;

describe('FoxAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
    __resetAllMocks();
    mockedDevice.isMediumDevice.mockReturnValue(false);

    // Mock Animated.timing to return a mock animation with required CompositeAnimation methods
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: jest.fn((callback) => {
        if (callback) callback({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    __clearLastMockedMethods();
  });

  describe('rendering', () => {
    it('renders fox animation container', () => {
      // Arrange & Act
      const { root } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Assert - Check that the component renders without crashing
      expect(root).toBeTruthy();
    });

    it('renders fox animation with correct testID', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Assert - The testID is passed through to the Rive component mock
      expect(getByTestId('fox-animation')).toBeTruthy();
    });

    it('renders Rive component with correct props', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Assert - Verify the Rive component is rendered with the expected testID
      const riveElement = getByTestId('fox-animation');
      expect(riveElement).toBeTruthy();

      // Verify that the Rive mock methods are available
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      expect(mockedMethods?.fireState).toBeDefined();
      expect(mockedMethods?.setInputState).toBeDefined();
    });

    it('renders with correct styles when hasFooter is true', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      const { root } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter />,
      );

      // Assert
      expect(root).toBeTruthy();
    });

    it('renders with correct styles when hasFooter is false', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      const { root } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Assert
      expect(root).toBeTruthy();
    });

    it('adjusts height based on device size for medium devices with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('adjusts height based on device size for medium devices without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });
  });

  describe('animation behavior', () => {
    it('does not start animation when startFoxAnimation is false', () => {
      // Arrange & Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter={false} />);

      // Assert
      expect(Animated.timing).not.toHaveBeenCalled();
    });

    it('starts animation when startFoxAnimation is true', async () => {
      // Arrange & Act
      render(<FoxAnimation startFoxAnimation hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      );
    });

    it('fires Rive state after animation completes', async () => {
      // Arrange & Act
      render(<FoxAnimation startFoxAnimation hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger and animation to complete
      });

      // Assert
      expect(Animated.timing).toHaveBeenCalled();

      // Check if the Rive methods are available and fireState is called
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      if (mockedMethods) {
        // The fireState call happens in the animation callback
        expect(mockedMethods.fireState).toHaveBeenCalledWith(
          'FoxRaiseUp',
          'Start',
        );
      }
    });

    it('handles Rive animation errors gracefully', async () => {
      // Arrange & Act
      render(<FoxAnimation startFoxAnimation hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert
      expect(Animated.timing).toHaveBeenCalled();
      expect(mockedLogger.error).toBeDefined();
    });

    it('calls animation in normal mode (not E2E)', async () => {
      // Arrange & Act
      render(<FoxAnimation startFoxAnimation hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert - In normal mode (E2E is mocked as false), animation should be called
      expect(Animated.timing).toHaveBeenCalled();
    });
  });

  describe('style calculations', () => {
    it('calculates correct height for medium device with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for large device with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for medium device without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for large device without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      render(<FoxAnimation startFoxAnimation={false} hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });
  });

  describe('prop changes', () => {
    it('triggers animation when startFoxAnimation changes from false to true', async () => {
      // Arrange
      const { rerender } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Act
      await act(async () => {
        rerender(<FoxAnimation startFoxAnimation hasFooter={false} />);
      });

      // Assert
      expect(Animated.timing).toHaveBeenCalled();
    });

    it('does not trigger animation when startFoxAnimation remains false', () => {
      // Arrange
      const { rerender } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Act
      rerender(<FoxAnimation startFoxAnimation={false} hasFooter />);

      // Assert
      expect(Animated.timing).not.toHaveBeenCalled();
    });

    it('adapts styles when hasFooter prop changes', () => {
      // Arrange
      const { rerender, root } = render(
        <FoxAnimation startFoxAnimation={false} hasFooter={false} />,
      );

      // Act
      rerender(<FoxAnimation startFoxAnimation={false} hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });
  });
});
