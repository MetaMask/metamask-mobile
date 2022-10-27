// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../../../Icon';
import { AvatarSize, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';
import {
  AVATAR_ICON_TEST_ID,
  AVATAR_ICON_ICON_TEST_ID,
} from './AvatarIcon.constants';

describe('AvatarIcon - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarIcon
        variant={AvatarVariants.Icon}
        size={AvatarSize.Md}
        name={IconName.AddOutline}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarIcon', () => {
  it('should render AvatarIcon component', () => {
    const wrapper = shallow(
      <AvatarIcon
        variant={AvatarVariants.Icon}
        size={AvatarSize.Md}
        name={IconName.AddOutline}
      />,
    );
    const avatarIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_ICON_TEST_ID,
    );
    expect(avatarIconComponent.exists()).toBe(true);
  });
  it('should render AvatarIcon with the right IconName', () => {
    const avatarName = IconName.AddOutline;
    const wrapper = shallow(
      <AvatarIcon
        variant={AvatarVariants.Icon}
        size={AvatarSize.Md}
        name={avatarName}
      />,
    );

    const avatarIconIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_ICON_ICON_TEST_ID,
    );
    expect(avatarIconIconComponent.props().name).toBe(avatarName);
  });
});
