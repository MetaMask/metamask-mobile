import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './';

describe('Button', () => {
  it('should render correctly', () => {
    const component = render(<Button />);
    expect(component).toMatchSnapshot();
  });
});
