// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import AvatarIcon from './AvatarIcon';

// Internal dependencies.
import { SAMPLE_AVATARICON_PROPS } from './AvatarIcon.constants';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AvatarIcon {...SAMPLE_AVATARICON_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
});
