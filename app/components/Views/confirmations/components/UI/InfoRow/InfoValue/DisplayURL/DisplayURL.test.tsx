import React from 'react';
import { render } from '@testing-library/react-native';

import DisplayURL from './DisplayURL';

describe('DisplayURL', () => {
  it('displays url without protocol', () => {
    const { getByText } = render(<DisplayURL url="https://google.com" />);
    expect(getByText('google.com')).toBeTruthy();
  });

  it('displays warning if protocol is HTTP', () => {
    const { getByText } = render(<DisplayURL url="http://google.com" />);
    expect(getByText('HTTP')).toBeTruthy();
  });
});
