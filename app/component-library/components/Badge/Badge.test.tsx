// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Tag from '../Tags/Tag';

// Internal dependencies.
import Badge from './Badge';
import { BADGE_CONTENT_TEST_ID } from './Badge.constants';

describe('Badge - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const content = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <Badge content={content}>
        <Tag label={'Children'} />
      </Badge>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Badge', () => {
  it('should render badge with the given content', () => {
    const content = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <Badge content={content}>
        <Tag label={'Children'} />
      </Badge>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_CONTENT_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
