import React from 'react';
import { render } from '@testing-library/react-native';
import ActionView from './';

describe('ActionView', () => {
  it('should render correctly', () => {
    const wrapper = render(<ActionView />);
    expect(wrapper).toMatchSnapshot();
  });
});
