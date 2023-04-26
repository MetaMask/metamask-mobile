import React from 'react';
import { render } from '@testing-library/react-native';
import FoxScreen from './';

describe('FoxScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<FoxScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
