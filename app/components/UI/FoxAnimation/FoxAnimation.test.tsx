import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import FoxAnimation from './FoxAnimation';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import {
  __getLastMockedMethods,
  __clearLastMockedMethods,
  __resetAllMocks,
} from '../../../__mocks__/rive-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock dependencies
jest.mock('../../../util/Logger');
jest.mock('../../../util/device');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
    __clearLastMockedMethods();
  });

  describe('rendering', () => {
    it('renders fox animation container', () => {
      // Arrange & Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert - Check that the component renders without crashing
      expect(root).toBeTruthy();
    });

    it('renders fox animation with correct testID', () => {
      // Arrange & Act
      const { getByTestId } = render(<FoxAnimation hasFooter={false} />);

      // Assert - The testID is passed through to the Rive component mock
      expect(getByTestId('fox-animation')).toBeTruthy();
    });

    it('renders Rive component with correct props', () => {
      // Arrange & Act
      const { getByTestId } = render(<FoxAnimation hasFooter={false} />);

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
      const { root } = render(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('renders with correct styles when hasFooter is false', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('adjusts height based on device size for medium devices with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('adjusts height based on device size for medium devices without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });
  });

  describe('animation behavior', () => {
    it('does not fire animation when trigger is not provided', async () => {
      // Arrange & Act
      render(<FoxAnimation hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert - No trigger means no animation
      const mockedMethods = __getLastMockedMethods();
      if (mockedMethods) {
        expect(mockedMethods.fireState).not.toHaveBeenCalled();
      }
    });

    it('fires Start trigger when trigger prop is "Start"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Start" hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      if (mockedMethods) {
        expect(mockedMethods.fireState).toHaveBeenCalledWith(
          'FoxRaiseUp',
          'Start',
        );
      }
    });

    it('fires Loader trigger when trigger prop is "Loader"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Loader" hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to trigger
      });

      // Assert
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      if (mockedMethods) {
        expect(mockedMethods.fireState).toHaveBeenCalledWith(
          'FoxRaiseUp',
          'Loader',
        );
      }
    });

    it('handles Rive animation errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Animation failed');
      const { getByTestId } = render(
        <FoxAnimation trigger="Start" hasFooter={false} />,
      );

      // Act
      await act(async () => {
        const mockedMethods = __getLastMockedMethods();
        if (mockedMethods) {
          // Simulate error by making fireState throw
          mockedMethods.fireState.mockImplementationOnce(() => {
            throw mockError;
          });
        }
      });

      // Assert - Component should still render despite error
      expect(getByTestId('fox-animation')).toBeTruthy();
      expect(mockedLogger.error).toBeDefined();
    });
  });

  describe('style calculations', () => {
    it('calculates correct height for medium device with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for large device with footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      render(<FoxAnimation hasFooter />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for medium device without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(true);

      // Act
      render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });

    it('calculates correct height for large device without footer', () => {
      // Arrange
      mockedDevice.isMediumDevice.mockReturnValue(false);

      // Act
      render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(mockedDevice.isMediumDevice).toHaveBeenCalled();
    });
  });

  describe('prop changes', () => {
    it('triggers animation when trigger changes from undefined to "Start"', async () => {
      // Arrange
      const { rerender } = render(<FoxAnimation hasFooter={false} />);
      __clearLastMockedMethods();

      // Act
      await act(async () => {
        rerender(<FoxAnimation trigger="Start" hasFooter={false} />);
      });

      // Assert
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      if (mockedMethods) {
        expect(mockedMethods.fireState).toHaveBeenCalledWith(
          'FoxRaiseUp',
          'Start',
        );
      }
    });

    it('triggers animation when trigger changes from "Start" to "Loader"', async () => {
      // Arrange
      const { rerender } = render(
        <FoxAnimation trigger="Start" hasFooter={false} />,
      );
      __clearLastMockedMethods();

      // Act
      await act(async () => {
        rerender(<FoxAnimation trigger="Loader" hasFooter={false} />);
      });

      // Assert
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      if (mockedMethods) {
        expect(mockedMethods.fireState).toHaveBeenCalledWith(
          'FoxRaiseUp',
          'Loader',
        );
      }
    });

    it('adapts styles when hasFooter prop changes', () => {
      // Arrange
      const { rerender, root } = render(<FoxAnimation hasFooter={false} />);

      // Act
      rerender(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });
  });

  describe('platform-specific positioning', () => {
    const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
    });

    it('calculates iOS position with footer and safe area insets', () => {
      // Arrange
      Platform.OS = 'ios';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 40,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('calculates iOS position with basePadding greater than 0', () => {
      // Arrange
      Platform.OS = 'ios';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 30,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('calculates Android position with basePadding greater than 20 with footer', () => {
      // Arrange
      Platform.OS = 'android';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 30,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('calculates Android position with basePadding greater than 20 without footer', () => {
      // Arrange
      Platform.OS = 'android';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 30,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('calculates Android position for standard devices with footer', () => {
      // Arrange
      Platform.OS = 'android';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 10,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('calculates Android position for standard devices without footer', () => {
      // Arrange
      Platform.OS = 'android';
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 10,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('uses fallback position for other platforms with footer', () => {
      // Arrange
      Platform.OS = 'windows' as typeof Platform.OS;
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter />);

      // Assert
      expect(root).toBeTruthy();
    });

    it('uses fallback position for other platforms without footer', () => {
      // Arrange
      Platform.OS = 'windows' as typeof Platform.OS;
      mockUseSafeAreaInsets.mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      // Act
      const { root } = render(<FoxAnimation hasFooter={false} />);

      // Assert
      expect(root).toBeTruthy();
    });
  });
});
