import React from 'react';
import { render } from '@testing-library/react-native';
import { KeyValueRowSkeleton } from './key-value-row-skeleton';

describe('KeyValueRowSkeleton', () => {
  it('renders with the provided testID', () => {
    const { getByTestId } = render(
      <KeyValueRowSkeleton testID="key-value-row-skeleton" />,
    );

    expect(getByTestId('key-value-row-skeleton')).toBeOnTheScreen();
  });
});
