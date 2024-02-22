import React from 'react';
import { render } from '@testing-library/react-native';
import CustomAlert from './';

describe('CustomAlert', () => {
  it('should render correctly', () => {
    const wrapper = render(<CustomAlert />);
    expect(wrapper).toMatchSnapshot();
  });
});
