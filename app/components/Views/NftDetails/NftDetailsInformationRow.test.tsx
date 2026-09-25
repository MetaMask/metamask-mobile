import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NftDetailsInformationRow from './NftDetailsInformationRow';
import { Text } from '@metamask/design-system-react-native';

describe('NftDetailsInformationRow', () => {
  it('renders the label and value', () => {
    const { getByText } = render(
      <NftDetailsInformationRow title="Token ID" value="5281" />,
    );

    expect(getByText('Token ID')).toBeOnTheScreen();
    expect(getByText('5281')).toBeOnTheScreen();
  });

  it('returns null when value is missing', () => {
    const { queryByText } = render(
      <NftDetailsInformationRow title="Token ID" />,
    );

    expect(queryByText('Token ID')).toBeNull();
  });

  it('calls onValuePress when the value is pressed', () => {
    const onValuePress = jest.fn();

    const { getByText } = render(
      <NftDetailsInformationRow
        title="Contract address"
        value="0xC7dF8...6B9E6"
        icon={<Text>copy</Text>}
        onValuePress={onValuePress}
      />,
    );

    fireEvent.press(getByText('0xC7dF8...6B9E6'));

    expect(onValuePress).toHaveBeenCalledTimes(1);
  });
});
