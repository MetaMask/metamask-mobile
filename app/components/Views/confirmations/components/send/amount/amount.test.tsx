import React from 'react';
import { render } from '@testing-library/react-native';

import Amount from './amount';

describe('Amount', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<Amount />);

    expect(getByText('Value:')).toBeTruthy();
  });
});
