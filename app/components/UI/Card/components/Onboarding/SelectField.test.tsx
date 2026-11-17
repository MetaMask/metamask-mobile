import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View as ReactNativeView } from 'react-native';
import SelectField from './SelectField';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    // Joins truthy classes so tests can assert on them.
    style: (...classes: unknown[]) => ({
      twClasses: classes.filter(Boolean).join(' '),
    }),
  }),
}));

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

  const TextColor = {
    TextDefault: 'text-default',
    TextAlternative: 'text-alternative',
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
    TextColor,
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
    expect(queryByTestId('icon-arrow-down')).not.toBeOnTheScreen();
  });

  it('uses the alternative text colour in read-only mode', () => {
    const { getByText } = render(<SelectField value="Canada" />);
    expect(getByText('Canada').props.color).toBe('text-alternative');
  });

  it('uses the default text colour for a value in interactive mode', () => {
    const { getByText } = render(
      <SelectField value="Canada" onPress={mockOnPress} />,
    );
    expect(getByText('Canada').props.color).toBe('text-default');
  });

  it('shows the placeholder in the alternative colour when empty', () => {
    const { getByText } = render(
      <SelectField
        placeholder="Select your country"
        onPress={mockOnPress}
        testID="select-field"
      />,
    );
    expect(getByText('Select your country').props.color).toBe(
      'text-alternative',
    );
  });

  it('shows the value instead of the placeholder when set', () => {
    const { getByText, queryByText } = render(
      <SelectField
        value="Canada"
        placeholder="Select your country"
        onPress={mockOnPress}
      />,
    );
    expect(getByText('Canada')).toBeOnTheScreen();
    expect(queryByText('Select your country')).not.toBeOnTheScreen();
  });

  it('exposes a button role and disabled state', () => {
    const { getByTestId } = render(
      <SelectField
        value="Canada"
        onPress={mockOnPress}
        isDisabled
        testID="select-field"
      />,
    );
    const touchable = getByTestId('select-field');
    expect(touchable).toHaveProp('accessibilityRole', 'button');
    expect(touchable.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('renders a start accessory before the value', () => {
    const { getByTestId } = render(
      <SelectField
        value="Account 1"
        onPress={mockOnPress}
        startAccessory={<ReactNativeView testID="start-accessory" />}
        testID="select-field"
      />,
    );

    expect(getByTestId('start-accessory')).toBeOnTheScreen();
    expect(getByTestId('select-field')).toHaveTextContent('Account 1');
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
    expect(queryByTestId('icon-arrow-down')).not.toBeOnTheScreen();
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
    expect(touchable).toBeDisabled();
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
        typeof node.props.style?.twClasses === 'string' &&
        node.props.style.twClasses.includes('opacity-50'),
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
        typeof node.props.style?.twClasses === 'string' &&
        node.props.style.twClasses.includes('opacity-50'),
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

  it('passes an accessibility label to the button', () => {
    const { getByTestId } = render(
      <SelectField
        value="🇺🇸 +1"
        onPress={mockOnPress}
        testID="select-field"
        accessibilityLabel="Country code, +1"
      />,
    );

    expect(getByTestId('select-field')).toHaveProp(
      'accessibilityLabel',
      'Country code, +1',
    );
  });

  it('does not wrap content in TouchableOpacity when read-only', () => {
    const { queryByTestId } = render(
      <SelectField value="Test" testID="select-field" />,
    );
    expect(queryByTestId('select-field')).not.toBeOnTheScreen();
  });
});
