import React from 'react';
import { render } from '@testing-library/react-native';

import Send from './send';

describe('Send', () => {
  it('renders correct;y', async () => {
    const { getByText } = render(<Send />);

    expect(getByText('SEND IMPLEMENTATION TO COME HERE')).toBeTruthy();
  });
});
