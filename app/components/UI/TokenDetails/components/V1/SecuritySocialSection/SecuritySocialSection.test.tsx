import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SecuritySocialSection from './SecuritySocialSection';
import { SecuritySocialSectionSelectors } from './SecuritySocialSection.testIds';
import { SecurityPillSelectors } from '../SecurityPill/SecurityPill.testIds';

describe('SecuritySocialSection', () => {
  it('renders the row with the security verdict it is given', () => {
    const { getByTestId, getByText } = render(
      <SecuritySocialSection securityVerdict="unscreened" />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    expect(getByText('Unscreened')).toBeOnTheScreen();
  });

  it('forwards the security press handler to the pill', () => {
    const onSecurityPress = jest.fn();
    const { getByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        onSecurityPress={onSecurityPress}
      />,
    );

    fireEvent.press(getByTestId(SecurityPillSelectors.PILL));

    expect(onSecurityPress).toHaveBeenCalledTimes(1);
  });
});
