import React from 'react';
import { render } from '@testing-library/react-native';

import AccountListFooter from './AccountListFooter';

describe('AccountListFooter', () => {
  it('renders correctly', () => {
    const { root } = render(<AccountListFooter />);

    expect(root).toBeTruthy();
  });
});
