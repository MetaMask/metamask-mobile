import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ReferralHeroCard from './ReferralHeroCard';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { selectReferralCode } from '../../../../../reducers/rewards/selectors';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../images/rewards/users-three.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockUsersThreeIcon() {
    return ReactActual.createElement(View, { testID: 'mock-users-three-icon' });
  };
});

jest.mock('./ShareCodeSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockShareCodeSheet({ isVisible }: { isVisible: boolean }) {
    return isVisible
      ? ReactActual.createElement(View, {
          testID: 'share-code-sheet-open',
        })
      : null;
  };
});

describe('ReferralHeroCard', () => {
  beforeEach(() => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectReferralCode) {
        return '8F3A21';
      }
      return undefined;
    });
  });

  it('opens the share sheet when Share is pressed', () => {
    const { getByTestId } = render(
      <ReferralHeroCard onViewEarnings={jest.fn()} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.SHARE_BUTTON));

    expect(getByTestId('share-code-sheet-open')).toBeOnTheScreen();
  });

  it.each([
    ['referrals', KOL_DASHBOARD_SELECTORS.REFERRALS_METRIC],
    ['trade commissions', KOL_DASHBOARD_SELECTORS.TRADE_COMMISSIONS_METRIC],
  ])('opens earnings when the %s card is pressed', (_name, testId) => {
    const onViewEarnings = jest.fn();
    const { getByTestId } = render(
      <ReferralHeroCard onViewEarnings={onViewEarnings} />,
    );

    fireEvent.press(getByTestId(testId));

    expect(onViewEarnings).toHaveBeenCalledTimes(1);
  });
});
