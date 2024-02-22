import React from 'react';
import { render } from '@testing-library/react-native';
import Collectibles from './';

describe('Collectibles', () => {
  it('should render correctly', () => {
    const wrapper = render(<Collectibles />);
    expect(wrapper).toMatchSnapshot();
  });
});
