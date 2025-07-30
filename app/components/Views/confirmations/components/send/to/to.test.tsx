import React from 'react';
import { render } from '@testing-library/react-native';

import To from './to';

describe('To', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<To />);

    expect(getByText('To:')).toBeTruthy();
  });
});
