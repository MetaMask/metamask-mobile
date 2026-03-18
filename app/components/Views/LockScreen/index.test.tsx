import React from 'react';
import { render } from '@testing-library/react-native';
import LockScreen from './';

describe('LockScreen', () => {
  it('should render correctly', () => {
    const component = render(<LockScreen />);
    expect(component).toMatchSnapshot();
  });
});
