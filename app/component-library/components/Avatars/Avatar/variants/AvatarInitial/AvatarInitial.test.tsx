// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarInitial from './AvatarInitial';
import {
  SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT,
  AVATAR_INITIAL_TEST_ID,
  AVATAR_INITIAL_TEXT_TEST_ID,
} from './AvatarInitial.constants';

describe('AvatarInitial - Snapshot', () => {
  it('should render AvatarInitial', () => {
    const wrapper = shallow(
      <AvatarInitial
        variant={AvatarVariants.Initial}
        size={AvatarSizes.Md}
        initial={SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarInitial', () => {
  it('should render AvatarInitial component', () => {
    const wrapper = shallow(
      <AvatarInitial
        variant={AvatarVariants.Initial}
        size={AvatarSizes.Md}
        initial={SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT}
      />,
    );
    const AvatarInitialComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_INITIAL_TEST_ID,
    );
    expect(AvatarInitialComponent.exists()).toBe(true);
  });
  it('should render AvatarInitial component with first letter as initials only', () => {
    const wrapper = shallow(
      <AvatarInitial
        variant={AvatarVariants.Initial}
        size={AvatarSizes.Md}
        initial={SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT}
      />,
    );
    const AvatarInitialTextComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_INITIAL_TEXT_TEST_ID,
    );
    expect(AvatarInitialTextComponent.props().children).not.toBe(
      SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT,
    );
    expect(AvatarInitialTextComponent.props().children).toBe(
      SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT[0],
    );
  });
});
