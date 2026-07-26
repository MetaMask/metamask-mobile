import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import OnboardingAnimation from './OnboardingAnimation';
import Device from '../../../util/device';
import { mockTheme } from '../../../util/theme';

// `useAppThemeFromContext` is globally mocked in testSetup.js to return
// `mockTheme`, so the logo is tinted with mockTheme.colors.icon.default.

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isMediumDevice: jest.fn(() => false),
  },
}));

describe('OnboardingAnimation', () => {
  const mockSetStartFoxAnimation = jest.fn();
  const defaultProps = {
    children: <Text testID="test-children">Test Children</Text>,
    startOnboardingAnimation: false,
    setStartFoxAnimation: mockSetStartFoxAnimation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
  });

  describe('Component Rendering', () => {
    it('renders the static wordmark logo image with correct testID', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      expect(getByTestId('metamask-wordmark-logo')).toBeOnTheScreen();
    });

    it('renders children within the wrapper', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      expect(getByTestId('test-children')).toBeOnTheScreen();
    });

    it('tints the logo with colors.icon.default', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      const logo = getByTestId('metamask-wordmark-logo');
      expect(logo).toHaveStyle({ tintColor: mockTheme.colors.icon.default });
    });
  });

  describe('Fox Animation Triggering', () => {
    it('does not call setStartFoxAnimation on initial render when startOnboardingAnimation is false', () => {
      render(<OnboardingAnimation {...defaultProps} />);

      expect(mockSetStartFoxAnimation).not.toHaveBeenCalled();
    });

    it('calls setStartFoxAnimation(true) when startOnboardingAnimation is true on mount', () => {
      render(
        <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
      );

      expect(mockSetStartFoxAnimation).toHaveBeenCalledWith(true);
    });

    it('calls setStartFoxAnimation(true) when startOnboardingAnimation becomes true', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(mockSetStartFoxAnimation).not.toHaveBeenCalled();

      rerender(
        <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
      );

      expect(mockSetStartFoxAnimation).toHaveBeenCalledWith(true);
    });

    it('keeps rendering the logo and children when startOnboardingAnimation becomes true', () => {
      const { rerender, getByTestId } = render(
        <OnboardingAnimation {...defaultProps} />,
      );

      rerender(
        <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
      );

      expect(getByTestId('metamask-wordmark-logo')).toBeOnTheScreen();
      expect(getByTestId('test-children')).toBeOnTheScreen();
    });

    it('accepts startOnboardingAnimation prop changes without throwing', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();
    });

    it('handles rerenders while animation is triggered without throwing', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
        rerender(
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />,
        );
      }).not.toThrow();
    });
  });

  describe('Device Responsive Behavior', () => {
    // LOGO_WIDTH/LOGO_HEIGHT are computed once at module load time from
    // Device.isMediumDevice(), which defaults to false (large device) in this
    // suite's mock. The logo therefore renders at the large-device dimensions.
    it('applies large device styles correctly', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);
      const logo = getByTestId('metamask-wordmark-logo');

      // Large device: LOGO_WIDTH = 200, LOGO_HEIGHT = 100 (width / 2)
      expect(logo).toHaveStyle({ width: 200, height: 100 });
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

      const logo = getByTestId('metamask-wordmark-logo');
      const children = getByTestId('test-children');

      expect(logo).toBeOnTheScreen();
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

    it('keeps rendering the static logo image', () => {
      const { getByTestId } = render(<OnboardingAnimation {...defaultProps} />);

      expect(getByTestId('metamask-wordmark-logo')).toBeOnTheScreen();
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

    it('handles rapid prop changes without errors', () => {
      const { rerender } = render(<OnboardingAnimation {...defaultProps} />);

      expect(() => {
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
        expect(getByTestId('metamask-wordmark-logo')).toBeOnTheScreen();
      });
    });

    it('renders without throwing on repeated mounts', () => {
      expect(() => {
        render(<OnboardingAnimation {...defaultProps} />);
      }).not.toThrow();

      expect(() => {
        render(<OnboardingAnimation {...defaultProps} />);
      }).not.toThrow();
    });
  });
});
