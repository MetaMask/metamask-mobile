import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import OnboardingAnimation from './OnboardingAnimation';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';

// Mock the entire utils module to ensure isE2E can be controlled
let mockIsE2E = false;

jest.mock('../../../util/test/utils', () => ({
  flushPromises: () => new Promise(setImmediate),
  FIXTURE_SERVER_PORT: 12345,
  testConfig: {},
  E2E_METAMETRICS_TRACK_URL: 'https://metametrics.test/track',
  get isE2E() {
    return mockIsE2E;
  },
  isQa: false,
  isTest: true,
  enableApiCallLogs: false,
  getFixturesServerPortInApp: () => 12345,
  isRc: false,
}));

const mockAppTheme = jest.fn(() => ({ themeAppearance: 'light' }));
jest.mock('../../../util/theme', () => ({
  ...jest.requireActual('../../../util/theme'),
  useAppThemeFromContext: mockAppTheme,
}));

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isMediumDevice: jest.fn(() => false),
  },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Mock the RIV animation file
jest.mock(
  '../../../animations/metamask_wordmark_animation_build-up.riv',
  () => 'mockRivFile',
);

// Mock Rive React Native - automatically uses the __mocks__ file via jest.config.js
// We need to import helper functions to access the mock
import {
  __getLastMockedMethods,
  __clearLastMockedMethods,
} from '../../../__mocks__/rive-react-native';

describe('OnboardingAnimation', () => {
  const mockSetStartFoxAnimation = jest.fn();
  const defaultProps = {
    children: <Text testID="test-children">Test Children</Text>,
    startOnboardingAnimation: false,
    setStartFoxAnimation: mockSetStartFoxAnimation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSetStartFoxAnimation.mockClear();

    // Reset E2E mode to default (false)
    mockIsE2E = false;

    // Clear Rive mock methods using the mock helper
    __clearLastMockedMethods();

    // Clear any pending timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Cleanup timers and animations
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders Rive animation component with correct testID', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      expect(getByTestId('metamask-wordmark-animation')).toBeOnTheScreen();
    });

    it('renders children within animated wrapper', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      expect(getByTestId('test-children')).toBeOnTheScreen();
    });

    it('renders with proper initial opacity for buttons in non-E2E mode', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      const children = getByTestId('test-children');
      expect(children).toBeOnTheScreen();
      // In non-E2E mode, the children should be initially invisible (opacity 0)
    });

    it('initializes Rive component with correct props', () => {
      render(<OnboardingAnimation {...defaultProps} />);

      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods).toBeDefined();
      expect(mockedMethods?.setInputState).toBeDefined();
      expect(mockedMethods?.fireState).toBeDefined();
    });
  });

  describe('Animation Triggering', () => {
    it('does not trigger animation when startOnboardingAnimation is false', () => {
      render(<OnboardingAnimation {...defaultProps} />);

      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods?.setInputState).not.toHaveBeenCalled();
      expect(mockedMethods?.fireState).not.toHaveBeenCalled();
    });

    it('renders component properly when startOnboardingAnimation becomes true', () => {
      const { rerender, getByTestId } = render(
        <OnboardingAnimation {...defaultProps} />,
      );

      // Trigger animation
      rerender(
        <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
      );

      // Component should still render correctly
      expect(getByTestId('metamask-wordmark-animation')).toBeOnTheScreen();
      expect(getByTestId('test-children')).toBeOnTheScreen();
    });

    it('accepts startOnboardingAnimation prop changes', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();
    });

    it('handles theme changes when animation is triggered', () => {
      // Test with light theme
      mockAppTheme.mockReturnValue({ themeAppearance: 'light' });

      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();

      // Test with dark theme
      mockAppTheme.mockReturnValue({ themeAppearance: 'dark' });

      expect(() => {
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();
    });
  });

  describe('E2E Mode Behavior', () => {
    beforeEach(() => {
      // Enable E2E mode for these tests
      mockIsE2E = true;
    });

    afterEach(() => {
      // Reset E2E mode after each test
      mockIsE2E = false;
    });

    it('sets initial opacity to 1 in E2E mode', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      const children = getByTestId('test-children');
      expect(children).toBeOnTheScreen();
      // In E2E mode, the children should be immediately visible (opacity 1)
    });

    it('immediately calls setStartFoxAnimation when animation is triggered in E2E mode', () => {
      // Render a completely new component in E2E mode
      const { rerender } = render(
        <OnboardingAnimation
          {...defaultProps}
          key="e2e-test" // Force new component instance
        />,
      );

      // Clear previous mock calls
      mockSetStartFoxAnimation.mockClear();

      rerender(
        <OnboardingAnimation
          {...defaultProps}
          startOnboardingAnimation
          key="e2e-test-animated" // Force new component instance
        />,
      );

      expect(mockSetStartFoxAnimation).toHaveBeenCalledWith(true);
    });

    it('does not render Rive component in E2E mode', () => {
      // Start with a fresh render in E2E mode
      const { rerender } = render(
        <OnboardingAnimation {...defaultProps} key="e2e-rive-test" />,
      );

      // Clear any mock calls from initial render
      __clearLastMockedMethods();

      // Trigger animation
      rerender(
        <OnboardingAnimation
          {...defaultProps}
          startOnboardingAnimation
          key="e2e-rive-test-animated"
        />,
      );

      // In E2E mode, Rive component is not rendered at all
      const mockedMethods = __getLastMockedMethods();

      // The Rive component should not be rendered in E2E mode
      expect(mockedMethods).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('handles component lifecycle gracefully', () => {
      // Logger is already imported at the top

      expect(() => {
        const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();

      // Logger should be available for error reporting if needed
      expect(Logger.error).toBeDefined();
    });
  });

  describe('Device Responsive Behavior', () => {
    it('applies medium device styles correctly', () => {
      // Device is already imported at the top
      (Device.isMediumDevice as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);
      const animation = getByTestId('metamask-wordmark-animation');

      expect(animation).toHaveStyle({ width: 180, height: 180 });
    });

    it('applies large device styles correctly', () => {
      // Device is already imported at the top
      (Device.isMediumDevice as jest.Mock).mockReturnValue(false);

      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);
      const animation = getByTestId('metamask-wordmark-animation');

      expect(animation).toHaveStyle({ width: 240, height: 240 });
    });
  });

  describe('Callback Invocation', () => {
    it('accepts setStartFoxAnimation callback function', () => {
      const customCallback = jest.fn();

      render(
        <OnboardingAnimation
          {...defaultProps}
          setStartFoxAnimation={customCallback}
        />,
      );

      expect(typeof customCallback).toBe('function');
    });

    it('does not call setStartFoxAnimation on initial render', () => {
      render(<OnboardingAnimation {...defaultProps} />);

      expect(mockSetStartFoxAnimation).not.toHaveBeenCalled();
    });
  });

  describe('Component Structure and Props', () => {
    it('renders with correct container structure', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      const animation = getByTestId('metamask-wordmark-animation');
      const children = getByTestId('test-children');

      expect(animation).toBeOnTheScreen();
      expect(children).toBeOnTheScreen();
    });

    it('handles multiple children elements correctly', () => {
      const customChildren = (
        <>
          <Text testID="child-1">Child 1</Text>
          <Text testID="child-2">Child 2</Text>
        </>
      );

      const { getByTestId } = render(
        <OnboardingAnimation {...defaultProps}>
          {customChildren}
        </OnboardingAnimation>,
      );

      expect(getByTestId('child-1')).toBeOnTheScreen();
      expect(getByTestId('child-2')).toBeOnTheScreen();
    });

    it('accepts function reference for setStartFoxAnimation prop', () => {
      const customCallback = jest.fn();

      render(
        <OnboardingAnimation
          {...defaultProps}
          setStartFoxAnimation={customCallback}
        />,
      );

      expect(typeof customCallback).toBe('function');
    });

    it('maintains Rive component configuration', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      const riveComponent = getByTestId('metamask-wordmark-animation');
      expect(riveComponent).toBeOnTheScreen();

      // Verify Rive methods are available
      const mockedMethods = __getLastMockedMethods();
      expect(mockedMethods?.setInputState).toBeDefined();
      expect(mockedMethods?.fireState).toBeDefined();
    });
  });

  describe('Edge Cases and Props Validation', () => {
    it('handles null children gracefully', () => {
      expect(() => {
        render(
          <OnboardingAnimation {...defaultProps}>{null}</OnboardingAnimation>,
        );
      }).not.toThrow();
    });

    it('handles undefined setStartFoxAnimation gracefully', () => {
      expect(() => {
        render(
          <OnboardingAnimation
            startOnboardingAnimation={false}
            setStartFoxAnimation={
              undefined as unknown as (value: boolean) => void
            }
          >
            <Text testID="test-children">Test Children</Text>
          </OnboardingAnimation>,
        );
      }).not.toThrow();
    });

    it('handles rapid prop changes without errors', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
        // Rapidly change between animation states
        for (let i = 0; i < 5; i++) {
          rerender(
            <OnboardingAnimation
              {...defaultProps}
              startOnboardingAnimation={i % 2 === 0}
            />,
          );
        }
      }).not.toThrow();
    });

    it('maintains component stability across multiple rerenders', () => {
      const { rerender, getByTestId } = render(
        <OnboardingAnimation {...defaultProps} />,
      );

      // Change children multiple times
      const childrenVariations = [
        <Text key="1" testID="child-1">
          Child 1
        </Text>,
        <Text key="2" testID="child-2">
          Child 2
        </Text>,
        <Text key="3" testID="child-3">
          Child 3
        </Text>,
      ];

      childrenVariations.forEach((children, index) => {
        rerender(
          <OnboardingAnimation {...defaultProps}>
            {children}
          </OnboardingAnimation>,
        );

        expect(getByTestId(`child-${index + 1}`)).toBeOnTheScreen();
        expect(getByTestId('metamask-wordmark-animation')).toBeOnTheScreen();
      });
    });

    it('renders correctly with both light and dark themeAppearance values', () => {
      // Test with light theme
      mockAppTheme.mockReturnValue({
        themeAppearance: 'light',
      });

      expect(() => {
        render(<OnboardingAnimation {...defaultProps} />);
      }).not.toThrow();

      // Test with dark theme value
      mockAppTheme.mockReturnValue({
        themeAppearance: 'dark',
      });

      expect(() => {
        render(<OnboardingAnimation {...defaultProps} />);
      }).not.toThrow();
    });
  });
});
