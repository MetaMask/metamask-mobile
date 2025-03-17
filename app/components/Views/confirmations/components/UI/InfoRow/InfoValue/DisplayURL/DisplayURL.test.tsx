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

  it('displays only the host part of the URL', () => {
    const { getByText } = render(
      <DisplayURL url="https://metamask.github.io/test-dapp/" />,
    );
    expect(getByText('metamask.github.io')).toBeTruthy();
  });
});
