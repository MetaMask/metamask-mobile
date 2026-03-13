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
    const { toJSON } = render(<BadgeStatus {...SAMPLE_BADGESTATUS_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render badge status', () => {
    render(<BadgeStatus {...SAMPLE_BADGESTATUS_PROPS} />);

    expect(screen.getByTestId(BADGE_STATUS_TEST_ID)).toBeDefined();
  });
});
