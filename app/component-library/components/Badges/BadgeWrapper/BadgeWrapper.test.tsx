// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Tag from '../../Tags/Tag';
import { SAMPLE_BADGE_PROPS } from '../Badge/Badge.constants';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { BADGE_WRAPPER_BADGE_TEST_ID } from './BadgeWrapper.constants';

describe('BadgeWrapper - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={SAMPLE_BADGE_PROPS}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeWrapper', () => {
  it('should render badge with the given content', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={SAMPLE_BADGE_PROPS}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_WRAPPER_BADGE_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
