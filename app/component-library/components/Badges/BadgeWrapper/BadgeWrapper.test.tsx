// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import { BADGENETWORK_TEST_ID } from '../Badge/variants/BadgeNetwork/BadgeNetwork.constants';
import BadgeWrapper from './BadgeWrapper';
import {
  SAMPLE_BADGEWRAPPER_PROPS,
  BADGE_WRAPPER_BADGE_TEST_ID,
} from './BadgeWrapper.constants';

describe('BadgeWrapper', () => {
  it('renders anchor content, network badge, and wrapper test id', () => {
    render(<BadgeWrapper {...SAMPLE_BADGEWRAPPER_PROPS} />);

    expect(screen.getByTestId(BADGE_WRAPPER_BADGE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('C')).toBeOnTheScreen();
    expect(screen.getByTestId(BADGENETWORK_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByTestId('network-avatar-image')).toBeOnTheScreen();
  });
});
