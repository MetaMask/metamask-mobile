import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SliderButton from './index';

describe('SliderButton', () => {
  it('should render correctly', () => {
    render(
      <SliderButton
        incompleteText="Incomplete Text"
        completeText="Complete Text"
      />,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
