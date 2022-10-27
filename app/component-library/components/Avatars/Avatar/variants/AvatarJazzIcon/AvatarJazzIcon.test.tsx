// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';
import {
  TEST_AVATAR_JAZZICON_ADDRESS,
  AVATAR_JAZZICON_TEST_ID,
} from './AvatarJazzIcon.constants';

describe('AvatarJazzIcon - Snapshot', () => {
  it('should render AvatarJazzIcon correctly', () => {
    const wrapper = shallow(
      <AvatarJazzIcon
        variant={AvatarVariants.JazzIcon}
        size={AvatarSizes.Md}
        address={TEST_AVATAR_JAZZICON_ADDRESS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarJazzIcon', () => {
  it('should render AvatarJazzIcon component', () => {
    const wrapper = shallow(
      <AvatarJazzIcon
        variant={AvatarVariants.JazzIcon}
        size={AvatarSizes.Md}
        address={TEST_AVATAR_JAZZICON_ADDRESS}
      />,
    );
    const AvatarJazzIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_JAZZICON_TEST_ID,
    );
    expect(AvatarJazzIconComponent.exists()).toBe(true);
  });
});
