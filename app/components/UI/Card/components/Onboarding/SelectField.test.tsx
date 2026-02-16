import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SelectField from './SelectField';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const TextVariant = {
    BodyMd: 'BodyMd',
  };

  const IconName = {
    ArrowDown: 'arrow-down',
  };

  const IconSize = {
    Sm: 'sm',
  };

  return {
    Box: ({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      twClassName?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID, accessibilityHint: twClassName, ...props },
        children,
      ),
    Text: ({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      twClassName?: string;
    }) =>
      ReactActual.createElement(
        Text,
        { testID, accessibilityHint: twClassName, ...props },
        children,
      ),
    Icon: ({ name }: { name: string }) =>
      ReactActual.createElement(View, { testID: `icon-${name}` }),
    TextVariant,
    IconName,
    IconSize,
  };
});

describe('SelectField', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the value text', () => {
    const { getByText } = render(<SelectField value="United States" />);
    expect(getByText('United States')).toBeOnTheScreen();
  });

  it('renders as read-only when onPress is not provided', () => {
    const { queryByTestId, queryByText } = render(
      <SelectField value="Canada" />,
    );

    expect(queryByText('Canada')).toBeOnTheScreen();
    expect(queryByTestId('icon-arrow-down')).toBeNull();
  });

  it('applies text-text-alternative style in read-only mode', () => {
    const { getByText } = render(<SelectField value="Canada" />);
    const textElement = getByText('Canada');
    expect(textElement.props.accessibilityHint).toBe('text-text-alternative');
  });

  it('does not apply alternative text style in interactive mode', () => {
    const { getByText } = render(
      <SelectField value="Canada" onPress={mockOnPress} />,
    );
    const textElement = getByText('Canada');
    expect(textElement.props.accessibilityHint).toBeUndefined();
  });

  it('renders the arrow-down icon when interactive', () => {
    const { getByTestId } = render(
      <SelectField value="United States" onPress={mockOnPress} />,
    );
    expect(getByTestId('icon-arrow-down')).toBeOnTheScreen();
  });

  it('hides the arrow-down icon when hideIcon is true', () => {
    const { queryByTestId } = render(
      <SelectField value="United States" onPress={mockOnPress} hideIcon />,
    );
    expect(queryByTestId('icon-arrow-down')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId } = render(
      <SelectField
        value="United States"
        onPress={mockOnPress}
        testID="select-field"
      />,
    );
    fireEvent.press(getByTestId('select-field'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('sets disabled prop on TouchableOpacity when isDisabled is true', () => {
    const { getByTestId } = render(
      <SelectField
        value="United States"
        onPress={mockOnPress}
        isDisabled
        testID="select-field"
      />,
    );
    const touchable = getByTestId('select-field');
    expect(touchable.props.disabled).toBe(true);
  });

  it('applies opacity-50 class when disabled', () => {
    const { UNSAFE_root } = render(
      <SelectField
        value="United States"
        onPress={mockOnPress}
        isDisabled
        testID="select-field"
      />,
    );

    const boxElements = UNSAFE_root.findAll(
      (node) =>
        typeof node.props.accessibilityHint === 'string' &&
        node.props.accessibilityHint.includes('opacity-50'),
    );
    expect(boxElements.length).toBeGreaterThan(0);
  });

  it('does not apply opacity-50 class when not disabled', () => {
    const { UNSAFE_root } = render(
      <SelectField
        value="United States"
        onPress={mockOnPress}
        testID="select-field"
      />,
    );

    const boxElements = UNSAFE_root.findAll(
      (node) =>
        typeof node.props.accessibilityHint === 'string' &&
        node.props.accessibilityHint.includes('opacity-50'),
    );
    expect(boxElements).toHaveLength(0);
  });

  it('renders without a value', () => {
    const { getByTestId } = render(
      <SelectField onPress={mockOnPress} testID="select-field" />,
    );
    expect(getByTestId('select-field')).toBeOnTheScreen();
  });

  it('wraps content in TouchableOpacity when interactive', () => {
    const { getByTestId } = render(
      <SelectField value="Test" onPress={mockOnPress} testID="select-field" />,
    );
    const touchable = getByTestId('select-field');
    expect(touchable).toBeOnTheScreen();
  });

  it('does not wrap content in TouchableOpacity when read-only', () => {
    const { queryByTestId } = render(
      <SelectField value="Test" testID="select-field" />,
    );
    expect(queryByTestId('select-field')).toBeNull();
  });
});
