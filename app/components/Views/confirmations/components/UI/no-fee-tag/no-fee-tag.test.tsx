import React from 'react';
import { render } from '@testing-library/react-native';
import { NoFeeTag, NoDepositFeeTag } from './no-fee-tag';

describe('NoFeeTag', () => {
  it('renders the "No fee" label', () => {
    const { getByText } = render(<NoFeeTag />);

    expect(getByText('No fee')).toBeOnTheScreen();
  });
});

describe('NoDepositFeeTag', () => {
  it('renders the "No deposit fee" label', () => {
    const { getByText } = render(<NoDepositFeeTag />);

    expect(getByText('No deposit fee')).toBeOnTheScreen();
  });
});
