// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Tag from '../Tags/Tag';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { BADGE_WRAPPER_CONTENT_TEST_ID } from './BadgeWrapper.constants';

describe('BadgeWrapper - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const content = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <BadgeWrapper content={content}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeWrapper', () => {
  it('should render badge with the given content', () => {
    const content = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <BadgeWrapper content={content}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_WRAPPER_CONTENT_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
