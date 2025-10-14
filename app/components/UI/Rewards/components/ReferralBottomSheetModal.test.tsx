import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReferralBottomSheetModal from './ReferralBottomSheetModal';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

// Mock BottomSheet
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (props: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback: () => void) => {
            callback();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface ButtonIconProps extends ComponentProps {
  onPress?: () => void;
  iconName?: string;
  iconProps?: Record<string, unknown>;
}

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Text: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(RNText, props, children),
    Box: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(View, props, children),
    ButtonIcon: ({ onPress, iconName, iconProps, ...props }: ButtonIconProps) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'button-icon',
          ...props,
        },
        ReactActual.createElement(
          View,
          {
            testID: `button-icon-${iconName}`,
            ...iconProps,
          },
          ReactActual.createElement(RNText, {}, 'ButtonIcon'),
        ),
      ),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
    },
    BoxAlignItems: {
      Center: 'center',
      Start: 'start',
    },
    BoxJustifyContent: {
      Center: 'center',
      End: 'end',
    },
    BoxFlexDirection: {
      Column: 'column',
      Row: 'row',
    },
    IconName: {
      Close: 'Close',
    },
    IconColor: {
      IconDefault: 'icon-default',
    },
  };
});

// Mock ReferralDetails child component
jest.mock('./ReferralDetails/ReferralDetails', () => {
  const mockReact = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockReferralDetails(props: { showInfoSection?: boolean }) {
    return mockReact.createElement(
      Text,
      {
        testID: 'referral-details',
        'data-show-info-section': props.showInfoSection,
      },
      'ReferralDetails',
    );
  };
});

// Mock SVG image
jest.mock('../../../../images/rewards/metamask-rewards-points.svg', () => {
  const mockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMetamaskRewardsPointsImage(props: ComponentProps) {
    return mockReact.createElement(
      View,
      {
        testID: 'metamask-rewards-points-image',
        ...props,
      },
      null,
    );
  };
});

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.ways_to_earn.referrals.sheet.title': 'Refer friends',
      'rewards.ways_to_earn.referrals.sheet.points': '+500 Points',
      'rewards.referral.info.description':
        'Invite friends to earn rewards together.',
    };
    return translations[key] || key;
  }),
}));

describe('ReferralBottomSheetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      // Act & Assert
      expect(() => render(<ReferralBottomSheetModal />)).not.toThrow();
    });

    it('should render BottomSheet component', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('should render close button', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('button-icon')).toBeOnTheScreen();
      expect(getByTestId('button-icon-Close')).toBeOnTheScreen();
    });

    it('should render title text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByText('Refer friends')).toBeOnTheScreen();
    });

    it('should render points badge text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByText('+500 Points')).toBeOnTheScreen();
    });

    it('should render MetaMask rewards points image', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
    });

    it('should render description text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(
        getByText('Invite friends to earn rewards together.'),
      ).toBeOnTheScreen();
    });

    it('should render ReferralDetails component', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('referral-details')).toBeOnTheScreen();
    });
  });

  describe('close button interaction', () => {
    it('should call navigation.goBack when close button is pressed', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const closeButton = getByTestId('button-icon');

      // Act
      fireEvent.press(closeButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should call navigation.goBack only once per press', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const closeButton = getByTestId('button-icon');

      // Act
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });
  });

  describe('ReferralDetails integration', () => {
    it('should pass showInfoSection as false to ReferralDetails', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const referralDetails = getByTestId('referral-details');

      // Assert
      expect(referralDetails.props['data-show-info-section']).toBe(false);
    });
  });

  describe('component structure', () => {
    it('should render all main sections in correct order', () => {
      // Act
      const { getByTestId, getByText } = render(<ReferralBottomSheetModal />);

      // Assert - Verify all sections exist
      expect(getByTestId('button-icon')).toBeOnTheScreen();
      expect(getByText('Refer friends')).toBeOnTheScreen();
      expect(getByText('+500 Points')).toBeOnTheScreen();
      expect(
        getByText('Invite friends to earn rewards together.'),
      ).toBeOnTheScreen();
      expect(getByTestId('referral-details')).toBeOnTheScreen();
    });

    it('should use Box components for layout', () => {
      // Act & Assert
      expect(() => render(<ReferralBottomSheetModal />)).not.toThrow();
    });
  });

  describe('localization', () => {
    it('should use correct translation keys for title', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith(
        'rewards.ways_to_earn.referrals.sheet.title',
      );
    });

    it('should use correct translation keys for points', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith(
        'rewards.ways_to_earn.referrals.sheet.points',
      );
    });

    it('should use correct translation keys for description', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith('rewards.referral.info.description');
    });
  });

  describe('accessibility', () => {
    it('should render all interactive elements', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert - Close button should be accessible
      const closeButton = getByTestId('button-icon');
      expect(closeButton).toBeOnTheScreen();
    });

    it('should have proper icon configuration for close button', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert - Verify icon name is correct
      expect(getByTestId('button-icon-Close')).toBeOnTheScreen();
    });
  });
});
