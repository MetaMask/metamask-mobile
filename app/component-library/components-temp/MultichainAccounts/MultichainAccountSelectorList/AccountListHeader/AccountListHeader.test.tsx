import React from 'react';
import { render } from '@testing-library/react-native';

import AccountListHeader from './AccountListHeader';

describe('AccountListHeader', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<AccountListHeader title="Test Wallet" />);

    expect(getByText('Test Wallet')).toBeTruthy();
  });
});
