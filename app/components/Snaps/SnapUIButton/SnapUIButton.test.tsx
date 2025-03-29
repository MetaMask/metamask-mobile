import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SnapUIButton } from './SnapUIButton';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import Text from '../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import AnimatedLottieView from 'lottie-react-native';

jest.mock('../SnapInterfaceContext', () => ({
  useSnapInterfaceContext: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: { default: '#FFFFFF' },
      border: { muted: '#CCCCCC', default: '#DDDDDD' },
      text: { default: '#000000' },
      info: { default: '#0376C9' },
      error: { default: '#D73A49' },
    },
  }),
}));

describe('SnapUIButton', () => {
  const mockHandleEvent = jest.fn();
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSnapInterfaceContext as jest.Mock).mockReturnValue({
      handleEvent: mockHandleEvent,
    });
  });

  it('renders correctly with text children', () => {
    const { getByText } = render(
      <SnapUIButton variant="primary">Test Button</SnapUIButton>,
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('renders correctly when disabled', () => {
    const { getByText, getByTestId } = render(
      <SnapUIButton variant="primary" disabled testID="disabled-button">
        Disabled Button
      </SnapUIButton>,
    );

    expect(getByText('Disabled Button')).toBeTruthy();
    expect(getByTestId('disabled-button').props.disabled).toBe(true);
  });

  it('renders with loading state', () => {
    const { UNSAFE_getByType } = render(
      <SnapUIButton variant="primary" loading>
        Loading Button
      </SnapUIButton>,
    );

    expect(UNSAFE_getByType(AnimatedLottieView)).toBeTruthy();
  });

  it('calls onPress and handles ButtonClickEvent when pressed', () => {
    const { getByText } = render(
      <SnapUIButton variant="primary" onPress={mockOnPress} name="test-button">
        Click Me
      </SnapUIButton>,
    );

    fireEvent.press(getByText('Click Me'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockHandleEvent).toHaveBeenCalledWith({
      event: UserInputEventType.ButtonClickEvent,
      name: 'test-button',
    });
  });

  it('handles FormSubmitEvent when button type is Submit', () => {
    const { getByText } = render(
      <SnapUIButton
        variant="primary"
        type={ButtonType.Submit}
        name="test-button"
        form="test-form"
      >
        Submit Form
      </SnapUIButton>,
    );

    fireEvent.press(getByText('Submit Form'));

    expect(mockHandleEvent).toHaveBeenCalledWith({
      event: UserInputEventType.ButtonClickEvent,
      name: 'test-button',
    });
    expect(mockHandleEvent).toHaveBeenCalledWith({
      event: UserInputEventType.FormSubmitEvent,
      name: 'test-form',
    });
  });

  it('renders icon component correctly without wrapping in Text', () => {
    const MockIcon = () => <View testID="mock-icon" />;
    MockIcon.displayName = 'Icon';

    const { getByTestId } = render(
      <SnapUIButton variant="primary" testID="icon-button">
        <MockIcon />
      </SnapUIButton>,
    );

    expect(getByTestId('icon-button')).toBeTruthy();
    expect(getByTestId('mock-icon')).toBeTruthy();
  });

  it('renders destructive variant with correct color', () => {
    const { UNSAFE_getAllByType } = render(
      <SnapUIButton variant="destructive">Destructive Button</SnapUIButton>,
    );

    const textComponents = UNSAFE_getAllByType(Text);
    expect(textComponents.length).toBeGreaterThan(0);
    expect(textComponents[0].props.color).toBe('Error');
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: '#FF0000', borderRadius: 16 };
    const { getByTestId } = render(
      <SnapUIButton
        variant="primary"
        style={customStyle}
        testID="styled-button"
      >
        Styled Button
      </SnapUIButton>,
    );

    const button = getByTestId('styled-button');
    expect(button.props.style.backgroundColor).toBe('#FF0000');
    expect(button.props.style.borderRadius).toBe(16);
  });

  it('handles non-string, non-icon children properly', () => {
    const NonStringComponent = () => <View testID="non-string-component" />;

    const { getByTestId } = render(
      <SnapUIButton variant="primary" testID="custom-children-button">
        <NonStringComponent />
      </SnapUIButton>,
    );

    expect(getByTestId('custom-children-button')).toBeTruthy();
    expect(getByTestId('non-string-component')).toBeTruthy();
  });

  it('sets proper accessibility properties', () => {
    const { getByTestId } = render(
      <SnapUIButton
        variant="primary"
        testID="accessible-button"
        name="button-name"
      >
        Accessible Button
      </SnapUIButton>,
    );

    const button = getByTestId('accessible-button');
    expect(button.props.accessible).toBe(true);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Accessible Button');
  });

  it('provides fallback to name for accessibilityLabel when children is not a string', () => {
    const NonStringComponent = () => <View testID="non-string-component" />;

    const { getByTestId } = render(
      <SnapUIButton
        variant="primary"
        testID="accessible-button"
        name="button-name"
      >
        <NonStringComponent />
      </SnapUIButton>,
    );

    const button = getByTestId('accessible-button');
    expect(button.props.accessibilityLabel).toBe('button-name');
  });
});
