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

const mockIsSocialV1Treatment = jest.mocked(isSocialV1Treatment);

const pressPrimaryAction = (traderId: string) => {
  const { getByTestId } = renderWithProvider(
    <TraderPositionFallback traderId={traderId} traderName="trader1" />,
  );
  fireEvent.press(
    getByTestId(TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION),
  );
};

describe('TraderPositionFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialV1Treatment.mockReturnValue(false);
  });

  it('pops to the Social tab without a trader for the Social V1 treatment', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    pressPrimaryAction('');

    // The root-stack Social V1 screen has no tab bar or back button (TSA-1636).
    expect(popToSocialTab).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the V0 leaderboard without a trader for the control', () => {
    pressPrimaryAction('');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0);
    expect(popToSocialTab).not.toHaveBeenCalled();
  });

  it('opens the V1 profile when a trader is known', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    pressPrimaryAction('trader-1');

    expect(navigateToSocialV1Profile).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      { traderId: 'trader-1', traderName: 'trader1' },
    );
    expect(popToSocialTab).not.toHaveBeenCalled();
  });
});
