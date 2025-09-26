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
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    // Provide a properly typed forwardRef and children prop
    return React.forwardRef(
      (props: { children?: React.ReactNode }, _ref: React.Ref<unknown>) =>
        React.createElement(View, { testID: 'bottom-sheet' }, props.children),
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
}

interface IconProps {
  name: string;
  [key: string]: unknown;
}

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Text: ({ children, ...props }: ComponentProps) =>
      React.createElement(RNText, props, children),
    Box: ({ children, ...props }: ComponentProps) =>
      React.createElement(View, props, children),
    Button: ({
      children,
      onPress,
      isDanger,
      disabled,
      ...props
    }: ButtonProps) =>
      React.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'button',
          disabled,
          ...props,
        },
        React.createElement(
          RNText,
          {
            // Put the test-relevant props on the Text element since that's what getByText finds
            isDanger,
            disabled,
            accessibilityState: disabled ? { disabled: true } : undefined,
          },
          children,
        ),
      ),
    Icon: ({ name, ...props }: IconProps) =>
      React.createElement(
        View,
        {
          testID: `icon-${name}`,
          ...props,
        },
        React.createElement(RNText, {}, 'Icon'),
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
});
