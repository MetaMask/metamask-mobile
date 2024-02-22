import React from 'react';
import { render } from '@testing-library/react-native';
import FadeView from './';

describe('FadeView', () => {
  it('should render correctly', () => {
    const wrapper = render(<FadeView visible />);
    expect(wrapper).toMatchSnapshot();
  });
});
