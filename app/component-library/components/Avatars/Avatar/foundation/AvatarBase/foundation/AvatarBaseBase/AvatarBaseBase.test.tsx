// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import AvatarBaseBase from './AvatarBaseBase';
import { AvatarSizes } from '../../../../Avatar.types';
import { AVATAR_BASE_BASE_TEST_ID } from './AvatarBaseBase.constants';

describe('AvatarBaseBase - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarBaseBase size={AvatarSizes.Md}>
        <View />
      </AvatarBaseBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarBaseBase', () => {
  it('should render AvatarBaseBase component', () => {
    const wrapper = shallow(
      <AvatarBaseBase size={AvatarSizes.Md}>
        <View />
      </AvatarBaseBase>,
    );
    const avatarBaseBaseComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_BASE_BASE_TEST_ID,
    );
    expect(avatarBaseBaseComponent.exists()).toBe(true);
  });
});
