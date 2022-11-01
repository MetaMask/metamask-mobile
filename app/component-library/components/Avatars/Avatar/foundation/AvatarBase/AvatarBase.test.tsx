// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarSizes } from '../../Avatar.types';
import { AVATAR_BASE_TEST_ID } from './AvatarBase.constants';

describe('AvatarBase - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarBase size={AvatarSizes.Md}>
        <View />
      </AvatarBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarBase', () => {
  it('should render AvatarBase component', () => {
    const wrapper = shallow(
      <AvatarBase size={AvatarSizes.Md}>
        <View />
      </AvatarBase>,
    );
    const avatarBaseComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_BASE_TEST_ID,
    );
    expect(avatarBaseComponent.exists()).toBe(true);
  });
});
