import React from 'react';
import { render } from '@testing-library/react-native';

import DisplayURL from './DisplayURL';

describe('DisplayURL', () => {
  it('should display url as expected', async () => {
    const container = render(<DisplayURL url="https://google.com" />);
    expect(container).toMatchSnapshot();
  });

  it('should show warning if protocol is HTTP', async () => {
    const { getByText } = render(<DisplayURL url="http://google.com" />);
    expect(getByText('HTTP')).toBeDefined();
  });

  it('displays only the host part of the URL', () => {
    const { getByText } = render(
      <DisplayURL url="https://metamask.github.io/test-dapp/" />,
    );
    expect(getByText('metamask.github.io')).toBeTruthy();
  });
});
