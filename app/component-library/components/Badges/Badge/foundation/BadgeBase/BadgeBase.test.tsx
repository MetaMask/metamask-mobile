// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import Tag from '../../../../Tags/Tag';

// Internal dependencies.
import BadgeBase from './BadgeBase';
import { BADGE_BASE_TEST_ID } from './BadgeBase.constants';

describe('BadgeBase - snapshots', () => {
  it('should render badge correctly', () => {
    const { toJSON } = render(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('BadgeBase', () => {
  it('should render badge with the given content', () => {
    render(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );

    const contentElement = screen.getByTestId(BADGE_BASE_TEST_ID);
    expect(contentElement).toBeTruthy();
  });
});

// Note: There are no user event interactions in the current test suite.
// If there were, they would be updated to use userEvent as shown below:
// const user = userEvent.setup();
// await user.click(screen.getByText('Submit'));

// Note: React Testing Library handles cleanup automatically, so there's no need for manual cleanup logic.

// Note: There are no native modules or permissions used in this test suite that require mocking.
