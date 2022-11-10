// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';
import {
  BADGE_NETWORK_TEST_ID,
  TEST_NETWORK_PROPS,
} from './BadgeNetwork.constants';

describe('BadgeNetwork - snapshots', () => {
  it('should render badge avatar', () => {
    const wrapper = shallow(
      <BadgeNetwork
        variant={BadgeVariants.Network}
        networkProps={TEST_NETWORK_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeNetwork', () => {
  it('should render badge avatar with the given content', () => {
    const wrapper = shallow(
      <BadgeNetwork
        variant={BadgeVariants.Network}
        networkProps={TEST_NETWORK_PROPS}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_NETWORK_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
