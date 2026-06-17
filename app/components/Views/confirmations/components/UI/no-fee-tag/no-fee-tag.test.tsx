import React from 'react';
import { render } from '@testing-library/react-native';
import { NoFeeTag } from './no-fee-tag';

describe('NoFeeTag', () => {
  it('renders the "No fee" label', () => {
    const { getByText } = render(<NoFeeTag />);

    expect(getByText('No fee')).toBeOnTheScreen();
  });
});
