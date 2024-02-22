import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedSpinner from './';

describe('AnimatedSpinner', () => {
  it('should render correctly', () => {
    const wrapper = render(<AnimatedSpinner />);
    expect(wrapper).toMatchSnapshot();
  });
});
