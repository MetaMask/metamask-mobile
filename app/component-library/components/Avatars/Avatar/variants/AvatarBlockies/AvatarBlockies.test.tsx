// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes } from '../../Avatar.types';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import {
  AVATAR_BLOCKIES_TEST_ID,
  AVATAR_BLOCKIES_IMAGE_TEST_ID,
  TEST_AVATAR_BLOCKIES_ACCOUNT_ADDRESS,
} from './AvatarBlockies.constants';

describe('AvatarBlockies - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarBlockies
        size={AvatarSizes.Xl}
        accountAddress={TEST_AVATAR_BLOCKIES_ACCOUNT_ADDRESS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarBlockies', () => {
  it('should render AvatarBlockies component', () => {
    const wrapper = shallow(
      <AvatarBlockies
        size={AvatarSizes.Xl}
        accountAddress={TEST_AVATAR_BLOCKIES_ACCOUNT_ADDRESS}
      />,
    );
    const avatarBlockiesComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_BLOCKIES_TEST_ID,
    );
    const avatarBlockiesImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_BLOCKIES_IMAGE_TEST_ID,
    );
    expect(avatarBlockiesComponent.exists()).toBe(true);
    expect(avatarBlockiesImageComponent.exists()).toBe(true);
  });
});
