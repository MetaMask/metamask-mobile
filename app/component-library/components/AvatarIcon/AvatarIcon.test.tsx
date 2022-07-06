import React from 'react';
import { shallow } from 'enzyme';
import AvatarIcon from './AvatarIcon';
import { BaseAvatarSize } from '../BaseAvatar';
import { IconName } from '../Icon';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarIcon size={BaseAvatarSize.Lg} icon={IconName.AddSquareFilled} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
