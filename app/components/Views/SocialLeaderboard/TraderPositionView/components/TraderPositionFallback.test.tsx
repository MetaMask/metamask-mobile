import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import TraderPositionFallback from './TraderPositionFallback';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import {
  isSocialV1Treatment,
  popToSocialTab,
} from '../../Onboarding/socialLeaderboardOnboardingNavigation';
import { navigateToSocialV1Profile } from '../../navigation/navigateToSocialV1Profile';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../Onboarding/socialLeaderboardOnboardingNavigation', () => ({
  getFollowTradingHomeRoute: jest.fn(() => 'SocialV0View'),
  isSocialV1Treatment: jest.fn(() => false),
  popToSocialTab: jest.fn(),
}));

jest.mock('../../navigation/navigateToSocialV1Profile', () => ({
  navigateToSocialV1Profile: jest.fn(),
}));

const mockPopToSocialTab = jest.mocked(popToSocialTab);
const mockNavigateToSocialV1Profile = jest.mocked(navigateToSocialV1Profile);
const navigation = expect.objectContaining({ navigate: mockNavigate });

describe('TraderPositionFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      name: 'pops to the Social tab without a trader for the Social V1 treatment',
      isV1: true,
      traderId: '',
      expectedMock: mockPopToSocialTab,
      expectedArgs: [navigation],
    },
    {
      name: 'opens the V0 leaderboard without a trader for the control',
      isV1: false,
      traderId: '',
      expectedMock: mockNavigate,
      expectedArgs: [Routes.SOCIAL.V0],
    },
    {
      name: 'opens the V1 profile when a trader is known',
      isV1: true,
      traderId: 'trader-1',
      expectedMock: mockNavigateToSocialV1Profile,
      expectedArgs: [
        navigation,
        { traderId: 'trader-1', traderName: 'trader1' },
      ],
    },
  ])('$name', ({ isV1, traderId, expectedMock, expectedArgs }) => {
    jest.mocked(isSocialV1Treatment).mockReturnValue(isV1);
    const { getByTestId } = renderWithProvider(
      <TraderPositionFallback traderId={traderId} traderName="trader1" />,
    );

    fireEvent.press(
      getByTestId(TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION),
    );

    expect(expectedMock).toHaveBeenCalledWith(...expectedArgs);
    [mockPopToSocialTab, mockNavigate, mockNavigateToSocialV1Profile]
      .filter((mock) => mock !== expectedMock)
      .forEach((mock) => expect(mock).not.toHaveBeenCalled());
  });
});
