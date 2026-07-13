import React from 'react';
import { render } from '@testing-library/react-native';
import PredictThePitchLeaderboard, {
  PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS,
} from './PredictThePitchLeaderboard';
import type { PredictThePitchLeaderboardEntryDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('../../utils/formatUtils', () => ({
  formatPercentChange: (value: number) =>
    `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`,
}));

const TEST_IDS = PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS;

const createEntry = (
  overrides: Partial<PredictThePitchLeaderboardEntryDto> = {},
): PredictThePitchLeaderboardEntryDto => ({
  rank: 1,
  referralCode: 'AAA111',
  roi: 0.1,
  ...overrides,
});

describe('PredictThePitchLeaderboard', () => {
  it('renders entries with ROI as the primary metric', () => {
    const { getByTestId, getByText } = render(
      <PredictThePitchLeaderboard
        entries={[
          createEntry({ rank: 1, referralCode: 'AAA111', roi: 0.2 }),
          createEntry({ rank: 2, referralCode: 'BBB222', roi: -0.05 }),
        ]}
        isLoading={false}
        hasError={false}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-1`)).toBeDefined();
    expect(getByText('+20.00%')).toBeDefined();
    expect(getByText('-5.00%')).toBeDefined();
  });

  it('uses split view in preview mode when user rank is outside the visible range', () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      createEntry({
        rank: index + 1,
        referralCode: `R${index + 1}`,
      }),
    );

    const { getByTestId, queryByTestId } = render(
      <PredictThePitchLeaderboard
        entries={entries}
        isLoading={false}
        hasError={false}
        maxEntries={5}
        currentUserReferralCode="USER"
        userPosition={{
          rank: 100,
          neighbors: [
            createEntry({ rank: 99, referralCode: 'N99' }),
            createEntry({ rank: 100, referralCode: 'USER' }),
          ],
        }}
      />,
    );

    expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-1`)).toBeDefined();
    expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-3`)).toBeDefined();
    expect(queryByTestId(`${TEST_IDS.ENTRY_ROW}-4`)).toBeNull();
    expect(getByTestId(TEST_IDS.NEIGHBOR_SEPARATOR)).toBeDefined();
    expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-100`)).toBeDefined();
  });

  it('shows pending tag on current user row when not eligible', () => {
    const { getByTestId } = render(
      <PredictThePitchLeaderboard
        entries={[
          createEntry({ rank: 1, referralCode: 'OTHER' }),
          createEntry({ rank: 2, referralCode: 'ME' }),
        ]}
        isLoading={false}
        hasError={false}
        currentUserReferralCode="ME"
        isCurrentUserEligible={false}
      />,
    );

    expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
  });

  it('does not show pending tag when current user is eligible', () => {
    const { queryByTestId } = render(
      <PredictThePitchLeaderboard
        entries={[
          createEntry({ rank: 1, referralCode: 'OTHER' }),
          createEntry({ rank: 2, referralCode: 'ME' }),
        ]}
        isLoading={false}
        hasError={false}
        currentUserReferralCode="ME"
        isCurrentUserEligible
      />,
    );

    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('does not show pending tag when isCurrentUserEligible is not provided', () => {
    const { queryByTestId } = render(
      <PredictThePitchLeaderboard
        entries={[createEntry({ rank: 1, referralCode: 'ME' })]}
        isLoading={false}
        hasError={false}
        currentUserReferralCode="ME"
      />,
    );

    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('renders loading and error states', () => {
    const { getByTestId, rerender } = render(
      <PredictThePitchLeaderboard entries={[]} isLoading hasError={false} />,
    );

    expect(getByTestId(TEST_IDS.LOADING)).toBeDefined();

    rerender(
      <PredictThePitchLeaderboard entries={[]} isLoading={false} hasError />,
    );
    expect(getByTestId(TEST_IDS.ERROR)).toBeDefined();
  });
});
