import React from 'react';
import { render } from '@testing-library/react-native';
import InvalidCustomNetworkAlert from '.';

describe('InvalidCustomNetworkAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<InvalidCustomNetworkAlert />);
    expect(toJSON()).toMatchSnapshot();
  });
});
