import React from 'react';
import { render } from '@testing-library/react-native';
import FoxScreen from './';

describe('FoxScreen', () => {
  it('should render correctly', () => {
    const wrapper = render(<FoxScreen />);
    expect(wrapper).toMatchSnapshot();
  });
});
