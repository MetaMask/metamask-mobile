import React from 'react';
import { render } from '@testing-library/react-native';

import InfoURL from './index';

describe('InfoURL', () => {
  it('should display url as expected', async () => {
    const container = render(<InfoURL url="https://google.com" />);
    expect(container).toMatchSnapshot();
  });

  it('should show warning if protocol is HTTP', async () => {
    const { getByText } = render(<InfoURL url="http://google.com" />);
    expect(getByText('HTTP')).toBeDefined();
  });
});
