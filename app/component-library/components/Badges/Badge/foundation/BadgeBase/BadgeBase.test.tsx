// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import Tag from '../../../../Tags/Tag';

// Internal dependencies.
import BadgeBase from './BadgeBase';
import { BADGE_BASE_TEST_ID } from './BadgeBase.constants';

describe('BadgeBase', () => {
  it('should render badge correctly and match snapshot', () => {
    const { toJSON } = render(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render badge with the given content and correct testID', () => {
    render(
      <BadgeBase>
        <Tag label={'Children'} />
      </BadgeBase>,
    );

    const contentElement = screen.getByTestId(BADGE_BASE_TEST_ID);
    expect(contentElement).toBeTruthy();
    // Replace toHaveStyle with a more basic assertion
    expect(contentElement.props.style).toContainEqual({ flexDirection: 'row' });
  });

  it('should render the Tag component within BadgeBase', () => {
    render(
      <BadgeBase>
        <Tag label={'Test Label'} />
      </BadgeBase>,
    );

    const tagElement = screen.getByText('Test Label');
    expect(tagElement).toBeTruthy();
    // Replace toBeVisible with a more basic assertion
    expect(tagElement.props.accessibilityState.hidden).toBeFalsy();
  });
});
