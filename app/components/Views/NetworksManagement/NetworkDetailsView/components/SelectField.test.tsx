import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SelectField from './SelectField';

jest.mock('@metamask/design-system-react-native', () => {
  const Rn = jest.requireActual('react-native');
  return {
    Box: Rn.View,
    Text: Rn.Text,
    TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
    Icon: ({ name }: { name: string }) => <Rn.Text>{name}</Rn.Text>,
    IconSize: { Sm: 'Sm' },
    IconName: { ArrowDown: 'ArrowDown' },
  };
});

describe('SelectField', () => {
  it('renders the value text', () => {
    const { getByText } = render(<SelectField value="Ethereum Mainnet" />);
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
  });

  it('renders secondary text when provided', () => {
    const { getByText } = render(
      <SelectField value="RPC" secondaryText="https://rpc.example.com" />,
    );
    expect(getByText('https://rpc.example.com')).toBeTruthy();
  });

  it('does not render secondary text when not provided', () => {
    const { queryByText } = render(<SelectField value="RPC" />);
    expect(queryByText('https://')).toBeNull();
  });

  it('renders the default ArrowDown icon', () => {
    const { getByText } = render(<SelectField value="Test" />);
    expect(getByText('ArrowDown')).toBeTruthy();
  });

  it('renders custom endContent instead of default icon', () => {
    const { Text: RNText } = jest.requireActual('react-native');
    const { getByText, queryByText } = render(
      <SelectField value="Test" endContent={<RNText>Custom End</RNText>} />,
    );
    expect(getByText('Custom End')).toBeTruthy();
    expect(queryByText('ArrowDown')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SelectField value="Test" onPress={onPress} testID="select-field" />,
    );

    fireEvent.press(getByTestId('select-field'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not wrap in TouchableOpacity when no onPress', () => {
    const { queryByTestId } = render(
      <SelectField value="Test" testID="select-field" />,
    );
    // testID is on TouchableOpacity, which should not exist
    expect(queryByTestId('select-field')).toBeNull();
  });

  it('passes disabled prop to TouchableOpacity when isDisabled is true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SelectField
        value="Test"
        onPress={onPress}
        isDisabled
        testID="select-field"
      />,
    );

    const touchable = getByTestId('select-field');
    expect(touchable.props.disabled).toBe(true);
  });
});
