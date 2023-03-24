// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariant } from '../../Badge.types';

// Internal dependencies.
import BadgeStatus from './BadgeStatus';
import {
  BADGE_STATUS_TEST_ID,
  SAMPLE_BADGESTATUS_PROPS,
} from './BadgeStatus.constants';

describe('BadgeStatus', () => {
  it('should render badge status correctly', () => {
    const wrapper = shallow(
      <BadgeStatus
        variant={BadgeVariant.Status}
        {...SAMPLE_BADGESTATUS_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render badge status', () => {
    const wrapper = shallow(
      <BadgeStatus
        variant={BadgeVariant.Status}
        {...SAMPLE_BADGESTATUS_PROPS}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_STATUS_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
