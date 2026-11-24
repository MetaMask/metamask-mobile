import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RewardsHeldBanner from './RewardsHeldBanner';
import { REWARDS_HELD_BANNER_TEST_IDS } from './RewardsHeldBanner.testIds';

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
  rewardsHeldTitle: 'Rewards held',
  rewardsHeldDescription:
    'These rewards are held until your tax determination is cleared.',
  rewardsHeldBanner: '{heldAmount} of rewards held.',
  rewardsHeldLearnMore: 'Learn more',
} as unknown as ReferralLocalizedText;

describe('RewardsHeldBanner', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('fills the held amount into the banner sentence', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsHeldBanner baseUnits="56000000" localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER)).toHaveTextContent(
      '$56.00 of rewards held.Learn more',
    );
    expect(
      getByTestId(REWARDS_HELD_BANNER_TEST_IDS.LEARN_MORE),
    ).toHaveTextContent('Learn more');
  });

  it('opens the held sheet with the reasons from the banner', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsHeldBanner baseUnits="1000000" localizedText={LOCALIZED_TEXT} />,
    );

    fireEvent.press(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Rewards held',
        description:
          'These rewards are held until your tax determination is cleared.',
      },
    );
  });

  it('leaves the amount blank when the base units are not a number', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsHeldBanner baseUnits="nope" localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER)).toHaveTextContent(
      'of rewards held.Learn more',
    );
  });
});
