import React from 'react';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import StackedAvatars from '.';

describe('StackedAvatars', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<StackedAvatars size={BaseAvatarSize.Xl} />);
    expect(wrapper).toMatchSnapshot();
  });
});
