import React from 'react';
import { shallow } from 'enzyme';
import Icon, { IconSize, IconName } from '.';

describe('Icon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Icon name={IconName.Medal} size={IconSize.Xl} />);
    expect(wrapper).toMatchSnapshot();
  });
});
