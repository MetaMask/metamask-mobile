// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { SAMPLE_AVATARACCOUNT_PROPS } from './AvatarAccount.constants';

describe('AvatarAccount', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AvatarAccount {...SAMPLE_AVATARACCOUNT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
});
