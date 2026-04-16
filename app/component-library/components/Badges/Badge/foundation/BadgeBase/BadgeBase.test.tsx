// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Tag from '../../../../Tags/Tag';

// Internal dependencies.
import BadgeBase from './BadgeBase';
import { BADGE_BASE_TEST_ID } from './BadgeBase.constants';

describe('BadgeBase - snapshots', () => {
  it('should render badge correctly', () => {
    const wrapper = shallow(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeBase', () => {
  it('should render badge with the given content', () => {
    const wrapper = shallow(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_BASE_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
