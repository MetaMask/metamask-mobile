import React from 'react';
import { render } from '@testing-library/react-native';
import { KeyValueSelectSkeleton } from './key-value-select-skeleton';

describe('KeyValueSelectSkeleton', () => {
  it('renders with the provided testID', () => {
    const { getByTestId } = render(
      <KeyValueSelectSkeleton testID="key-value-select-skeleton" />,
    );

    expect(getByTestId('key-value-select-skeleton')).toBeOnTheScreen();
  });
});
