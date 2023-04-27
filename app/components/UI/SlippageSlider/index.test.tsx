import React from 'react';
import { shallow } from 'enzyme';
import SlippageSlider from './index';

describe('SlippageSlider', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
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
