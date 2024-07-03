// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import {
  SAMPLE_BADGEWRAPPER_PROPS,
  BADGE_WRAPPER_BADGE_TEST_ID,
} from './BadgeWrapper.constants';

describe('BadgeWrapper', () => {
  it('should render BadgeWrapper correctly', () => {
    const { toJSON } = render(<BadgeWrapper {...SAMPLE_BADGEWRAPPER_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_WRAPPER_BADGE_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
