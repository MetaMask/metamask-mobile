import React from 'react';
import { shallow } from 'enzyme';
import Badge from './Badge';
import { BADGE_CONTENT_TEST_ID } from './Badge.constants';
import { BadgePositionVariant } from './Badge.types';
import Tag from '../Tags/Tag';

describe('Badge - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const badgeContent = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <Badge badgeContent={badgeContent}>
        <Tag label={'Children'} />
      </Badge>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render badge with bottom right position correctly', () => {
    const badgeContent = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <Badge
        badgeContent={badgeContent}
        position={BadgePositionVariant.BottomRight}
      >
        <Tag label={'Children'} />
      </Badge>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Badge', () => {
  it('should render badge with the given badgeContent', () => {
    const badgeContent = <Tag label={'Badge'} />;
    const wrapper = shallow(
      <Badge badgeContent={badgeContent}>
        <Tag label={'Children'} />
      </Badge>,
    );

    const badgeContentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_CONTENT_TEST_ID,
    );
    expect(badgeContentElement.exists()).toBe(true);
  });
});
