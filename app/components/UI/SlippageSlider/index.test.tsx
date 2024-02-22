import React from 'react';
import { render } from '@testing-library/react-native';
import SlippageSlider from './index';

describe('SlippageSlider', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <SlippageSlider
        range={[1, 5]}
        increment={1}
        onChange={() => undefined}
        formatTooltipText={(text) => `${text}%`}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
