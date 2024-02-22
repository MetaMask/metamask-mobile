import React from 'react';
import { render } from '@testing-library/react-native';
import CustomNonce from '.';

describe('CustomNonce', () => {
  it('should render correctly', () => {
    const wrapper = render(<CustomNonce />);
    expect(wrapper).toMatchSnapshot();
  });
});
