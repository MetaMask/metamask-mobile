import React from 'react';
import { render } from '@testing-library/react-native';

import InfoDate from './InfoDate';

const timestamp = 1647359825; // March 15, 2022  15:57:05 UTC

describe('InfoDate', () => {
  it('renders date', async () => {
    const { getByText } = render(<InfoDate unixTimestamp={timestamp} />);
    expect(getByText('15 March 2022, 15:57')).toBeDefined();
  });
});
