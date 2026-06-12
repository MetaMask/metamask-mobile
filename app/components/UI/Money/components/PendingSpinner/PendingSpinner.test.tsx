import React from 'react';
import { render } from '@testing-library/react-native';
import { IconSize } from '../../../../../component-library/components/Icons/Icon';
import PendingSpinner from './PendingSpinner';

describe('PendingSpinner', () => {
  it('renders with the provided testID', () => {
    const { getByTestId } = render(<PendingSpinner testID="pending-spinner" />);

    expect(getByTestId('pending-spinner')).toBeOnTheScreen();
  });

  it('renders at a custom size without a testID', () => {
    const { toJSON } = render(<PendingSpinner size={IconSize.Lg} />);

    expect(toJSON()).toBeTruthy();
  });
});
