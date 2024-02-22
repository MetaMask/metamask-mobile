import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './';

describe('Button', () => {
  it('should render correctly', () => {
    const wrapper = render(<Button />);
    expect(wrapper).toMatchSnapshot();
  });
});
