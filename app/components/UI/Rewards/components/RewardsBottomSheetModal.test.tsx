import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock dependencies
import RewardsBottomSheetModal, { ModalType } from './RewardsBottomSheetModal';

const mockConfirmAction = {
  label: 'Confirm',
  onPress: jest.fn(),
};

const defaultRoute = {
  params: {
    title: 'Test Title',
    description: 'Test Description',
    confirmAction: mockConfirmAction,
  },
};

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})), // Return empty style object
  })),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock BottomSheet
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    // Provide a properly typed forwardRef and children prop
    return ReactActual.forwardRef(
      (props: { children?: React.ReactNode }, _ref: React.Ref<unknown>) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        ),
    );
  },
);

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface ButtonProps extends ComponentProps {
  onPress?: () => void;
  disabled?: boolean;
  isDanger?: boolean;
  isLoading?: boolean;
}

interface ButtonIconProps extends ComponentProps {
  onPress?: () => void;
  iconName?: string;
  iconProps?: Record<string, unknown>;
}

interface IconProps {
  name: string;
  [key: string]: unknown;
}

// Mock design system components
const { Text: RNText } = jest.requireActual('react-native');
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNTextActual,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Text: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(RNTextActual, props, children),
    Box: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(View, props, children),
    Button: ({
      children,
      onPress,
      isDanger,
      disabled,
      ...props
    }: ButtonProps) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'button',
          disabled,
          ...props,
        },
        ReactActual.createElement(
          RNTextActual,
          {
            // Put the test-relevant props on the Text element since that's what getByText finds
            isDanger,
            disabled,
            isLoading: props.isLoading,
            accessibilityState: disabled ? { disabled: true } : undefined,
          },
          children,
        ),
      ),
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
          ReactActual.createElement(RNTextActual, {}, 'ButtonIcon'),
        ),
      ),
    Icon: ({ name, ...props }: IconProps) =>
      ReactActual.createElement(
        View,
        {
          testID: `icon-${name}`,
          ...props,
        },
        ReactActual.createElement(RNTextActual, {}, 'Icon'),
      ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodySm: 'BodySm',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
    },
    BoxFlexDirection: {
      Column: 'column',
      Row: 'row',
    },
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    IconName: {
      Danger: 'danger',
      Question: 'question',
    },
    IconSize: {
      Xl: 'xl',
    },
    IconColor: {
      IconDefault: 'icon-default',
    },
  };
});

describe('RewardsBottomSheetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with minimal required props', () => {
    expect(() =>
      render(<RewardsBottomSheetModal route={defaultRoute} />),
    ).not.toThrow();
  });

  it('should render title and description', () => {
    const { getByText } = render(
      <RewardsBottomSheetModal route={defaultRoute} />,
    );

    expect(getByText('Test Title')).toBeOnTheScreen();
    expect(getByText('Test Description')).toBeOnTheScreen();
  });

  it('should render confirm button with correct label', () => {
    const { getByText } = render(
      <RewardsBottomSheetModal route={defaultRoute} />,
    );

    expect(getByText('Confirm')).toBeOnTheScreen();
  });

  it('should call confirmAction.onPress when confirm button is pressed', () => {
    const { getByText } = render(
      <RewardsBottomSheetModal route={defaultRoute} />,
    );

    const confirmButton = getByText('Confirm');
    fireEvent.press(confirmButton);

    expect(mockConfirmAction.onPress).toHaveBeenCalled();
  });

  it('should render danger icon by default', () => {
    const { getByTestId } = render(
      <RewardsBottomSheetModal route={defaultRoute} />,
    );

    expect(getByTestId('icon-danger')).toBeOnTheScreen();
  });

  it('should render question icon for confirmation modal type', () => {
    const confirmationRoute = {
      params: {
        title: 'Confirmation Title',
        description: 'Confirmation Description',
        type: ModalType.Confirmation,
        confirmAction: mockConfirmAction,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={confirmationRoute} />,
    );

    expect(getByTestId('icon-question')).toBeOnTheScreen();
  });

  it('should render single button when showCancelButton is false and no onCancel', () => {
    const { getAllByTestId } = render(
      <RewardsBottomSheetModal route={defaultRoute} />,
    );

    const buttons = getAllByTestId('button');
    expect(buttons).toHaveLength(1);
  });

  it('should render two buttons when showCancelButton is true', () => {
    const routeWithCancel = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        showCancelButton: true,
      },
    };

    const { getAllByTestId, getByText } = render(
      <RewardsBottomSheetModal route={routeWithCancel} />,
    );

    const buttons = getAllByTestId('button');
    expect(buttons).toHaveLength(2);
    expect(getByText('Cancel')).toBeOnTheScreen();
    expect(getByText('Confirm')).toBeOnTheScreen();
  });

  it('should render two buttons when onCancel is provided', () => {
    const mockOnCancel = jest.fn();
    const routeWithOnCancel = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        onCancel: mockOnCancel,
      },
    };

    const { getAllByTestId, getByText } = render(
      <RewardsBottomSheetModal route={routeWithOnCancel} />,
    );

    const buttons = getAllByTestId('button');
    expect(buttons).toHaveLength(2);
    expect(getByText('Cancel')).toBeOnTheScreen();
  });

  it('should use custom cancel label when provided', () => {
    const routeWithCustomCancelLabel = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        showCancelButton: true,
        cancelLabel: 'Go Back',
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={routeWithCustomCancelLabel} />,
    );

    expect(getByText('Go Back')).toBeOnTheScreen();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const mockOnCancel = jest.fn();
    const routeWithOnCancel = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        onCancel: mockOnCancel,
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={routeWithOnCancel} />,
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call navigation.goBack when cancel button is pressed without onCancel', () => {
    const routeWithCancel = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        showCancelButton: true,
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={routeWithCancel} />,
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should disable confirm button when confirmAction.disabled is true', () => {
    const disabledConfirmAction = {
      label: 'Disabled Confirm',
      onPress: jest.fn(),
      disabled: true,
    };

    const routeWithDisabledAction = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: disabledConfirmAction,
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={routeWithDisabledAction} />,
    );

    const confirmButton = getByText('Disabled Confirm');
    expect(confirmButton).toBeDisabled();
  });

  it('should apply danger styling for danger modal type', () => {
    const dangerRoute = {
      params: {
        title: 'Danger Title',
        description: 'Danger Description',
        type: ModalType.Danger,
        confirmAction: mockConfirmAction,
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={dangerRoute} />,
    );

    const confirmButton = getByText('Confirm');
    expect(confirmButton.props.isDanger).toBe(true);
  });

  it('should not apply danger styling for confirmation modal type', () => {
    const confirmationRoute = {
      params: {
        title: 'Confirmation Title',
        description: 'Confirmation Description',
        type: ModalType.Confirmation,
        confirmAction: mockConfirmAction,
      },
    };

    const { getByText } = render(
      <RewardsBottomSheetModal route={confirmationRoute} />,
    );

    const confirmButton = getByText('Confirm');
    expect(confirmButton.props.isDanger).toBe(false);
  });

  it('should render close button when cancelMode is top-right-cross-icon', () => {
    const routeWithCrossIcon = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        cancelMode: 'top-right-cross-icon' as const,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={routeWithCrossIcon} />,
    );

    expect(getByTestId('button-icon')).toBeOnTheScreen();
  });

  it('should call onCancel when close button is pressed with top-right-cross-icon mode', () => {
    const mockOnCancel = jest.fn();
    const routeWithCrossIcon = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        cancelMode: 'top-right-cross-icon' as const,
        onCancel: mockOnCancel,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={routeWithCrossIcon} />,
    );

    const closeButton = getByTestId('button-icon');
    fireEvent.press(closeButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should render custom icon when customIcon prop is provided', () => {
    const CustomIcon = () => <RNText testID="custom-icon">Custom</RNText>;

    const routeWithCustomIcon = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        customIcon: <CustomIcon />,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={routeWithCustomIcon} />,
    );

    expect(getByTestId('custom-icon')).toBeOnTheScreen();
  });

  it('should not render icon when showIcon is false', () => {
    const routeWithoutIcon = {
      params: {
        title: 'Test Title',
        description: 'Test Description',
        confirmAction: mockConfirmAction,
        showIcon: false,
      },
    };

    const { queryByTestId } = render(
      <RewardsBottomSheetModal route={routeWithoutIcon} />,
    );

    expect(queryByTestId('icon-danger')).not.toBeOnTheScreen();
  });

  it('should render React node as title when title is not a string', () => {
    const CustomTitle = () => (
      <RNText testID="custom-title">Custom Title</RNText>
    );

    const routeWithCustomTitle = {
      params: {
        title: <CustomTitle />,
        description: 'Test Description',
        confirmAction: mockConfirmAction,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={routeWithCustomTitle} />,
    );

    expect(getByTestId('custom-title')).toBeOnTheScreen();
  });

  it('should render React node as description when description is not a string', () => {
    const CustomDescription = () => (
      <RNText testID="custom-description">Custom Description</RNText>
    );

    const routeWithCustomDescription = {
      params: {
        title: 'Test Title',
        description: <CustomDescription />,
        confirmAction: mockConfirmAction,
      },
    };

    const { getByTestId } = render(
      <RewardsBottomSheetModal route={routeWithCustomDescription} />,
    );

    expect(getByTestId('custom-description')).toBeOnTheScreen();
  });
});
