import React from 'react';
import { render } from '@testing-library/react-native';
import SliderButton from './index';

describe('SliderButton', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SliderButton
        incompleteText="Incomplete Text"
        completeText="Complete Text"
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
