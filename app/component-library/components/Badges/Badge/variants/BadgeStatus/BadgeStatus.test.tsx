// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import BadgeStatus from './BadgeStatus';
import {
  BADGE_STATUS_TEST_ID,
  SAMPLE_BADGESTATUS_PROPS,
} from './BadgeStatus.constants';

describe('BadgeStatus', () => {
  it('should render badge status correctly', () => {
    const wrapper = render(<BadgeStatus {...SAMPLE_BADGESTATUS_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render badge status', () => {
    render(<BadgeStatus {...SAMPLE_BADGESTATUS_PROPS} />);

    const contentElement = screen.getByTestId(BADGE_STATUS_TEST_ID);
    expect(contentElement).toBeTruthy();
  });
});
