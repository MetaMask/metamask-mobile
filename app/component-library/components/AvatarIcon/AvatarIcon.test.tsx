import React from 'react';
import { shallow } from 'enzyme';
import AvatarIcon from './AvatarIcon';
import { AvatarSize } from '../Avatar';
import { IconName } from '../Icon';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarIcon size={AvatarSize.Lg} icon={IconName.AddSquareFilled} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
