import React from 'react';
import { render } from '@testing-library/react-native';

import Url from './Url';

describe('URL', () => {
  it('should display url as expected', async () => {
    const container = render(<Url url="https://google.com" />);
    expect(container).toMatchSnapshot();
  });

  it('should show warning if protocol is HTTP', async () => {
    const { getByText } = render(<Url url="http://google.com" />);
    expect(getByText('HTTP')).toBeDefined();
  });
});
