import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SnapUIButton } from './SnapUIButton';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
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
      primary: { default: '#0376C9' },
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

  const getColorForTextVariant = (color: TextColor): string => {
    switch (color) {
      case TextColor.Info:
        return '#0376C9';
      case TextColor.Error:
        return '#D73A49';
      case TextColor.Muted:
        return '#000000';
      default:
        return '#000000';
    }
  };

  const createStyledText = (
    text: string,
    color: TextColor = TextColor.Info,
  ) => (
    <Text color={color} style={{ color: getColorForTextVariant(color) }}>
      {text}
    </Text>
  );

  it('renders correctly with text children', () => {
    const { getByText } = render(
      <SnapUIButton>{createStyledText('Test Button')}</SnapUIButton>,
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('renders correctly when disabled', () => {
    const { getByText, getByTestId } = render(
      <SnapUIButton disabled testID="disabled-button">
        {createStyledText('Disabled Button', TextColor.Muted)}
      </SnapUIButton>,
    );

    expect(getByText('Disabled Button')).toBeTruthy();
    expect(getByTestId('disabled-button').props.disabled).toBe(true);
  });

  it('renders with loading state', () => {
    const { UNSAFE_getByType } = render(
      <SnapUIButton loading>{createStyledText('Loading Button')}</SnapUIButton>,
    );

    expect(UNSAFE_getByType(AnimatedLottieView)).toBeTruthy();
  });

  it('calls onPress and handles ButtonClickEvent when pressed', () => {
    const { getByText } = render(
      <SnapUIButton onPress={mockOnPress} name="test-button">
        {createStyledText('Click Me')}
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
        type={ButtonType.Submit}
        name="test-button"
        form="test-form"
      >
        {createStyledText('Submit Form')}
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

  it('renders icon component correctly', () => {
    const MockIcon = () => <View testID="mock-icon" />;
    MockIcon.displayName = 'Icon';

    const { getByTestId } = render(
      <SnapUIButton testID="icon-button">
        <MockIcon />
      </SnapUIButton>,
    );

    expect(getByTestId('icon-button')).toBeTruthy();
    expect(getByTestId('mock-icon')).toBeTruthy();
  });

  it('renders destructive variant button correctly', () => {
    const { getByTestId } = render(
      <SnapUIButton testID="destructive-button">
        {createStyledText('Destructive Button', TextColor.Error)}
      </SnapUIButton>,
    );

    expect(getByTestId('destructive-button')).toBeTruthy();
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: '#FF0000', borderRadius: 16 };
    const { getByTestId } = render(
      <SnapUIButton style={customStyle} testID="styled-button">
        {createStyledText('Styled Button')}
      </SnapUIButton>,
    );

    const button = getByTestId('styled-button');
    expect(button.props.style.backgroundColor).toBe('#FF0000');
    expect(button.props.style.borderRadius).toBe(16);
  });

  it('handles non-string, non-icon children properly', () => {
    const NonStringComponent = () => <View testID="non-string-component" />;

    const { getByTestId } = render(
      <SnapUIButton testID="custom-children-button">
        <NonStringComponent />
      </SnapUIButton>,
    );

    expect(getByTestId('custom-children-button')).toBeTruthy();
    expect(getByTestId('non-string-component')).toBeTruthy();
  });

  it('sets proper accessibility properties', () => {
    const { getByTestId } = render(
      <SnapUIButton testID="accessible-button" name="button-name">
        {createStyledText('Accessible Button')}
      </SnapUIButton>,
    );

    const button = getByTestId('accessible-button');
    expect(button.props.accessible).toBe(true);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('button-name');
  });

  it('provides fallback to name for accessibilityLabel when children is not a string', () => {
    const NonStringComponent = () => <View testID="non-string-component" />;

    const { getByTestId } = render(
      <SnapUIButton testID="accessible-button" name="button-name">
        <NonStringComponent />
      </SnapUIButton>,
    );

    const button = getByTestId('accessible-button');
    expect(button.props.accessibilityLabel).toBe('button-name');
  });
});
