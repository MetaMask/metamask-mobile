import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RewardsPausedBanner, {
  REWARDS_PAUSED_BANNER_TEST_IDS,
} from './RewardsPausedBanner';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

const LOCALIZED_TEXT = {
  rewardsPausedTitle: 'Rewards paused',
  rewardsPausedDescription:
    "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
  rewardsPausedBanner: '{amount} of rewards paused.',
  rewardsPausedLearnMore: 'Learn more',
} as unknown as ReferralLocalizedText;

describe('RewardsPausedBanner', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('fills the under-review amount into the banner sentence', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsPausedBanner
        baseUnits="9150000"
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('$9.15 of rewards paused.Learn more');
    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.LEARN_MORE),
    ).toHaveTextContent('Learn more');
  });

  it('opens the paused sheet from the banner', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsPausedBanner
        baseUnits="1000000"
        localizedText={LOCALIZED_TEXT}
      />,
    );

    fireEvent.press(getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Rewards paused',
        description:
          "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
      },
    );
  });

  it('leaves the amount blank when the base units are not a number', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsPausedBanner baseUnits="nope" localizedText={LOCALIZED_TEXT} />,
    );

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('of rewards paused.Learn more');
  });
});
