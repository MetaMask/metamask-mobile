import React from 'react';
import { render } from '@testing-library/react-native';
import CustomAlert from './';

describe('CustomAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<CustomAlert />);
    expect(toJSON()).toMatchSnapshot();
  });
});
