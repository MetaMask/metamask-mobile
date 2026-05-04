import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTradingCampaignLeaderboard, {
  PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS,
} from './PerpsTradingCampaignLeaderboard';
import type { PerpsTradingCampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatSignedUsd: (value: number) => `$${value.toFixed(2)}`,
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../../../../../images/rewards/crown.svg', () => 'CrownIcon');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    BROWSER: { HOME: 'BrowserHome', VIEW: 'BrowserView' },
  },
}));

const TEST_IDS = PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS;

const createPerpsEntry = (
  overrides: Partial<PerpsTradingCampaignLeaderboardEntry> = {},
): PerpsTradingCampaignLeaderboardEntry => ({
  rank: 1,
  referralCode: 'REF001',
  pnl: 100,
  qualified: true,
  ...overrides,
});

const defaultProps = {
  entries: [
    createPerpsEntry({ rank: 1, referralCode: 'A' }),
    createPerpsEntry({ rank: 2, referralCode: 'B' }),
  ],
  isLoading: false,
  hasError: false,
};

describe('PerpsTradingCampaignLeaderboard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders container and list with entry testIDs', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignLeaderboard {...defaultProps} />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByTestId(TEST_IDS.LIST)).toBeDefined();
    expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-1`)).toBeDefined();
    expect(getByTestId(TEST_IDS.POWERED_BY)).toBeDefined();
  });

  it('navigates to in-app browser with HyperTracker attribution URL when brand is pressed', () => {
    const { getByText } = render(
      <PerpsTradingCampaignLeaderboard {...defaultProps} />,
    );
    fireEvent.press(
      getByText(
        'rewards.perps_trading_campaign.leaderboard_hypertracker_brand',
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      'BrowserHome',
      expect.objectContaining({
        screen: 'BrowserView',
        params: expect.objectContaining({
          newTabUrl:
            'https://hypertracker.io?utm_source=metamask&utm_medium=leaderboard&utm_campaign=partner-attribution',
        }),
      }),
    );
  });

  describe('split view top count (preview vs full, ranks 21–22 vs other)', () => {
    const tenEntries = Array.from({ length: 10 }, (_, i) =>
      createPerpsEntry({
        rank: i + 1,
        referralCode: `S${String(i + 1).padStart(3, '0')}`,
        pnl: 10 - i,
      }),
    );

    it('preview mode shows top 3 then separator and neighbors when rank is outside range', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsTradingCampaignLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
          currentUserReferralCode="USER"
          userPosition={{
            rank: 250,
            neighbors: [
              createPerpsEntry({ rank: 249, referralCode: 'N249' }),
              createPerpsEntry({ rank: 250, referralCode: 'USER' }),
              createPerpsEntry({ rank: 251, referralCode: 'N251' }),
            ],
          }}
        />,
      );

      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-1`)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-2`)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-3`)).toBeDefined();
      expect(queryByTestId(`${TEST_IDS.ENTRY_ROW}-4`)).toBeNull();
      expect(getByTestId(TEST_IDS.NEIGHBOR_SEPARATOR)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-250`)).toBeDefined();
    });

    const twentyFiveEntries = Array.from({ length: 25 }, (_, i) =>
      createPerpsEntry({
        rank: i + 1,
        referralCode: `R${String(i + 1).padStart(3, '0')}`,
        pnl: 1000 - i,
      }),
    );

    it('full mode shows 18 top rows when user rank is 21 (reduced top strip)', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsTradingCampaignLeaderboard
          {...defaultProps}
          entries={twentyFiveEntries}
          currentUserReferralCode="USER"
          userPosition={{
            rank: 21,
            neighbors: [
              createPerpsEntry({ rank: 20, referralCode: 'N020' }),
              createPerpsEntry({ rank: 21, referralCode: 'USER' }),
              createPerpsEntry({ rank: 22, referralCode: 'N022' }),
            ],
          }}
        />,
      );

      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-1`)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-18`)).toBeDefined();
      expect(queryByTestId(`${TEST_IDS.ENTRY_ROW}-19`)).toBeNull();
      expect(getByTestId(TEST_IDS.NEIGHBOR_SEPARATOR)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-20`)).toBeDefined();
    });

    it('full mode shows 20 top rows when user rank is 23 (standard strip)', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsTradingCampaignLeaderboard
          {...defaultProps}
          entries={twentyFiveEntries}
          currentUserReferralCode="USER"
          userPosition={{
            rank: 23,
            neighbors: [
              createPerpsEntry({ rank: 22, referralCode: 'N022' }),
              createPerpsEntry({ rank: 23, referralCode: 'USER' }),
              createPerpsEntry({ rank: 24, referralCode: 'N024' }),
            ],
          }}
        />,
      );

      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-20`)).toBeDefined();
      expect(queryByTestId(`${TEST_IDS.ENTRY_ROW}-21`)).toBeNull();
      expect(getByTestId(TEST_IDS.NEIGHBOR_SEPARATOR)).toBeDefined();
      expect(getByTestId(`${TEST_IDS.ENTRY_ROW}-22`)).toBeDefined();
    });
  });
});
