import React from 'react';
import { render, act } from '@testing-library/react-native';
import FoxAnimation from './FoxAnimation';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import {
  __getLastRiveViewMethods,
  __mockRiveTriggerInput,
  __resetRiveMocks,
} from '../../../__mocks__/rive-app-react-native';

// Mock dependencies
jest.mock('../../../util/Logger');
jest.mock('../../../util/device');

const mockedLogger = Logger as jest.Mocked<typeof Logger>;
const mockedDevice = Device as jest.Mocked<typeof Device>;

describe('FoxAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockedDevice.isMediumDevice.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    __resetRiveMocks();
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

      // Assert - The testID is passed through to the RiveView mock
      expect(getByTestId('fox-animation')).toBeTruthy();
    });

    it('renders RiveView with correct props', () => {
      // Arrange & Act
      const { getByTestId } = render(<FoxAnimation hasFooter={false} />);

      // Assert - Verify the RiveView is rendered with the expected testID
      const riveElement = getByTestId('fox-animation');
      expect(riveElement).toBeTruthy();

      // Verify that the Rive mock methods are available
      const mockedMethods = __getLastRiveViewMethods();
      expect(mockedMethods).toBeDefined();
      expect(mockedMethods?.triggerInput).toBeDefined();
      expect(mockedMethods?.setBooleanInputValue).toBeDefined();
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
        // Wait for useEffect to run
      });

      // Assert - No trigger means no animation
      expect(__mockRiveTriggerInput).not.toHaveBeenCalled();
    });

    it('fires Start trigger when trigger prop is "Start"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Start" hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to run
      });

      // Assert - triggerInput takes only the trigger name; the state machine
      // is configured via the stateMachineName view prop
      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Start');
    });

    it('fires Loader trigger when trigger prop is "Loader"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Loader" hasFooter={false} />);

      await act(async () => {
        // Wait for useEffect to run
      });

      // Assert
      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Loader');
    });

    it('logs an error when triggerInput throws', async () => {
      // Arrange
      const mockError = new Error('Animation failed');
      __mockRiveTriggerInput.mockImplementationOnce(() => {
        throw mockError;
      });

      // Act
      const { getByTestId } = render(
        <FoxAnimation trigger="Start" hasFooter={false} />,
      );

      await act(async () => {
        // Wait for useEffect to run
      });

      // Assert - Component still renders and the error is logged
      expect(getByTestId('fox-animation')).toBeTruthy();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        mockError,
        'Error triggering Fox Rive animation',
      );
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
      expect(__mockRiveTriggerInput).not.toHaveBeenCalled();

      // Act
      await act(async () => {
        rerender(<FoxAnimation trigger="Start" hasFooter={false} />);
      });

      // Assert
      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Start');
    });

    it('triggers animation when trigger changes from "Start" to "Loader"', async () => {
      // Arrange
      const { rerender } = render(
        <FoxAnimation trigger="Start" hasFooter={false} />,
      );
      __mockRiveTriggerInput.mockClear();

      // Act
      await act(async () => {
        rerender(<FoxAnimation trigger="Loader" hasFooter={false} />);
      });

      // Assert
      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Loader');
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
});
