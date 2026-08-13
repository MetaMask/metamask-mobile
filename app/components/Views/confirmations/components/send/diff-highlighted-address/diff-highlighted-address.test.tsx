import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import { DiffHighlightedAddress } from './diff-highlighted-address';

describe('DiffHighlightedAddress', () => {
  it('renders consecutive address differences with default warning styles', () => {
    const { getByText } = render(
      <DiffHighlightedAddress
        address="0x123456"
        diffIndices={[3, 4, 7]}
        label="Entered address"
        dotTwColor="bg-error-default"
      />,
    );

    expect(getByText('Entered address')).toBeOnTheScreen();
    expect(getByText('0x1')).toBeOnTheScreen();
    expect(getByText('23')).toBeOnTheScreen();
    expect(getByText('45')).toBeOnTheScreen();
    expect(getByText('6')).toBeOnTheScreen();
  });

  it('renders custom styles for address differences', () => {
    const { getByText } = render(
      <DiffHighlightedAddress
        address="0xabcdef"
        diffIndices={[2, 3]}
        label="Known address"
        dotTwColor="bg-success-default"
        highlightTwColor="bg-success-muted"
        diffTextColor={TextColor.SuccessDefault}
      />,
    );

    expect(getByText('Known address')).toBeOnTheScreen();
    expect(getByText('0x')).toBeOnTheScreen();
    expect(getByText('ab')).toBeOnTheScreen();
    expect(getByText('cdef')).toBeOnTheScreen();
  });
});
