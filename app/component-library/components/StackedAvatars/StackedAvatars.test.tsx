import React from 'react';
import { shallow } from 'enzyme';
import StackedAvatars from '.';

describe('StackedAvatars', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<StackedAvatars tokenList={[]} />);
    expect(wrapper).toMatchSnapshot();
  });
});
