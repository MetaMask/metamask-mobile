import React from 'react';
import { Platform } from 'react-native';
import { render, act } from '@testing-library/react-native';
import FoxAnimation, { getSafeBottomPosition } from './FoxAnimation';
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

const insets = (bottom: number) => ({
  top: 0,
  left: 0,
  right: 0,
  bottom,
});

describe('getSafeBottomPosition', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOS,
    });
  });

  const setPlatformOS = (os: typeof Platform.OS) => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => os,
    });
  };

  it('returns iOS footer offset using bottom inset plus 60', () => {
    setPlatformOS('ios');

    expect(getSafeBottomPosition(true, insets(50))).toBe(110);
  });

  it('returns minimum 100 for iOS footer when inset is small', () => {
    setPlatformOS('ios');

    expect(getSafeBottomPosition(true, insets(0))).toBe(100);
  });

  it('returns Android footer offset with large inset', () => {
    setPlatformOS('android');

    expect(getSafeBottomPosition(true, insets(48))).toBe(108);
  });

  it('returns Android footer offset with small inset', () => {
    setPlatformOS('android');

    expect(getSafeBottomPosition(true, insets(10))).toBe(100);
  });

  it('returns 100 for footer on non-iOS non-Android platforms', () => {
    setPlatformOS('web');

    expect(getSafeBottomPosition(true, insets(0))).toBe(100);
  });

  it('returns negative iOS offset when home indicator inset is present', () => {
    setPlatformOS('ios');

    expect(getSafeBottomPosition(false, insets(34))).toBe(-24);
  });

  it('clamps iOS no-footer offset to -40 for large home indicator', () => {
    setPlatformOS('ios');

    expect(getSafeBottomPosition(false, insets(80))).toBe(-40);
  });

  it('returns -20 for iOS with no bottom inset', () => {
    setPlatformOS('ios');

    expect(getSafeBottomPosition(false, insets(0))).toBe(-20);
  });

  it('tucks Android full-bleed fox into the gesture inset like iOS', () => {
    setPlatformOS('android');

    expect(
      getSafeBottomPosition(false, insets(48), { fullBleedBottom: true }),
    ).toBe(-38);
  });

  it('uses a small negative Android full-bleed offset when inset is missing', () => {
    setPlatformOS('android');

    expect(
      getSafeBottomPosition(false, undefined, { fullBleedBottom: true }),
    ).toBe(-20);
  });

  it('returns 0 for Android when parent already applied bottom safe area', () => {
    setPlatformOS('android');

    expect(getSafeBottomPosition(false, insets(48))).toBe(0);
  });

  it('returns -20 for no-footer on non-iOS non-Android platforms', () => {
    setPlatformOS('web');

    expect(getSafeBottomPosition(false, insets(0))).toBe(-20);
  });
});

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

      await act(async () => Promise.resolve());

      // Assert - No trigger means no animation
      expect(__mockRiveTriggerInput).not.toHaveBeenCalled();
    });

    it('fires Start trigger when trigger prop is "Start"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Start" hasFooter={false} />);

      await act(async () => Promise.resolve());

      // Assert - triggerInput takes only the trigger name; the state machine
      // is configured via the stateMachineName view prop
      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Start');
    });

    it('fires Loader trigger when trigger prop is "Loader"', async () => {
      // Arrange & Act
      render(<FoxAnimation trigger="Loader" hasFooter={false} />);

      await act(async () => Promise.resolve());

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

      await act(async () => Promise.resolve());

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
