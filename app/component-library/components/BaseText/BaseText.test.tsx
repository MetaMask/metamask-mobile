import React from 'react';
import { shallow } from 'enzyme';
import BaseText, { BaseTextVariant } from './';

describe('BaseText', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <BaseText variant={BaseTextVariant.lBodyMD}>{`I'm Text!`}</BaseText>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
