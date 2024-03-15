import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './';

describe('Button', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Button />);
    expect(toJSON()).toMatchSnapshot();
  });
});
