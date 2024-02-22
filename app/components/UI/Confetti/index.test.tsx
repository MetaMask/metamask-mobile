import React from 'react';
import { render } from '@testing-library/react-native';
import Confetti from './';

describe('Confetti', () => {
  it('should render correctly', () => {
    const wrapper = render(<Confetti />);
    expect(wrapper).toMatchSnapshot();
  });
});
