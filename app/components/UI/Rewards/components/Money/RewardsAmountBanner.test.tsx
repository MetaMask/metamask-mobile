import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RewardsHeldBanner from './RewardsHeldBanner';
import { REWARDS_HELD_BANNER_TEST_IDS } from './RewardsHeldBanner.testIds';
import RewardsPausedBanner from './RewardsPausedBanner';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from './RewardsPausedBanner.testIds';

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
  rewardsHeldTitle: 'Rewards held',
  rewardsHeldDescription:
    'These rewards are held until your tax determination is cleared.',
  rewardsHeldBanner: '{heldAmount} of rewards held.',
  rewardsHeldLearnMore: 'Learn more',
} as unknown as ReferralLocalizedText;

/**
 * The paused and held banners are wrappers over `RewardsAmountBanner`, so one
 * set of cases runs against both and checks each passes its own copy and IDs.
 */
describe.each([
  {
    name: 'RewardsPausedBanner',
    Banner: RewardsPausedBanner,
    testIds: REWARDS_PAUSED_BANNER_TEST_IDS,
    amountText: '$9.15 of rewards paused.Learn more',
    blankText: 'of rewards paused.Learn more',
    sheet: {
      title: 'Rewards paused',
      description:
        "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
    },
  },
  {
    name: 'RewardsHeldBanner',
    Banner: RewardsHeldBanner,
    testIds: REWARDS_HELD_BANNER_TEST_IDS,
    amountText: '$9.15 of rewards held.Learn more',
    blankText: 'of rewards held.Learn more',
    sheet: {
      title: 'Rewards held',
      description:
        'These rewards are held until your tax determination is cleared.',
    },
  },
])('$name', ({ Banner, testIds, amountText, blankText, sheet }) => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('fills the amount into the banner sentence', () => {
    const { getByTestId } = renderWithProvider(
      <Banner baseUnits="9150000" localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByTestId(testIds.BANNER)).toHaveTextContent(amountText);
    expect(getByTestId(testIds.LEARN_MORE)).toHaveTextContent('Learn more');
  });

  it('opens the info sheet from the banner', () => {
    const { getByTestId } = renderWithProvider(
      <Banner baseUnits="1000000" localizedText={LOCALIZED_TEXT} />,
    );

    fireEvent.press(getByTestId(testIds.BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      sheet,
    );
  });

  it('leaves the amount blank when the base units are not a number', () => {
    const { getByTestId } = renderWithProvider(
      <Banner baseUnits="nope" localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByTestId(testIds.BANNER)).toHaveTextContent(blankText);
  });
});
