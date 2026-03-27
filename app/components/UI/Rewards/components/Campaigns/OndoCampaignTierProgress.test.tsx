import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoCampaignTierProgress, {
  ONDO_TIER_PROGRESS_TEST_IDS,
} from './OndoCampaignTierProgress';
import type {
  CampaignDto,
  OndoGmPortfolioDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../../selectors/rewards';
import {
  selectCampaigns,
  selectOndoCampaignPortfolioById,
} from '../../../../../reducers/rewards/selectors';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectCampaignParticipantOptedIn: jest.fn(),
}));

jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectCampaigns: jest.fn(),
  selectOndoCampaignPortfolioById: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../util/formatFiat', () => ({
  __esModule: true,
  default: (amount: { toFixed: (dp: number) => string }) =>
    `$${Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_leaderboard_position.tier_progress_top_tier':
        "You've reached the top tier",
      'rewards.ondo_campaign_leaderboard_position.tier_progress_deposit_more':
        'Deposit {{amount}} more to reach the next tier',
    };
    const raw = translations[key] ?? key;
    if (params?.amount !== undefined) {
      return raw.replace('{{amount}}', String(params.amount));
    }
    return raw;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const SUBSCRIPTION_ID = 'sub-456';
const CAMPAIGN_ID = 'campaign-ondo-1';

const mockOptedInSelector = jest.fn();
const mockPortfolioSelector = jest.fn();

function createCampaignWithTiers(
  overrides: Partial<CampaignDto> = {},
): CampaignDto {
  return {
    id: CAMPAIGN_ID,
    name: 'Ondo',
    type: 'ONDO' as CampaignDto['type'],
    details: {
      tiers: [
        { name: 'STARTER', minNetDeposit: 0 },
        { name: 'MID', minNetDeposit: 5000 },
        { name: 'UPPER', minNetDeposit: 10000 },
      ],
    },
    ...overrides,
  } as CampaignDto;
}

function createPortfolio(
  netDeposit: string,
  overrides: Partial<OndoGmPortfolioDto> = {},
): OndoGmPortfolioDto {
  return {
    positions: [],
    summary: {
      totalCurrentValue: '0',
      totalCostBasis: '0',
      totalUsdDeposited: '0',
      netDeposit,
      portfolioPnl: '0',
      portfolioPnlPercent: '0',
    },
    computedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupUseSelector({
  isOptedIn = true,
  campaigns = [createCampaignWithTiers()],
  portfolio = createPortfolio('7500'),
}: {
  isOptedIn?: boolean;
  campaigns?: CampaignDto[];
  portfolio?: OndoGmPortfolioDto | null;
} = {}) {
  mockOptedInSelector.mockReturnValue(isOptedIn);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) {
      return SUBSCRIPTION_ID;
    }
    if (selector === selectCampaigns) {
      return campaigns;
    }
    if (selector === mockOptedInSelector) {
      return isOptedIn;
    }
    if (selector === mockPortfolioSelector) {
      return portfolio;
    }
    return undefined;
  });
}

describe('OndoCampaignTierProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectOndoCampaignPortfolioById as jest.MockedFunction<
        typeof selectOndoCampaignPortfolioById
      >
    ).mockReturnValue(mockPortfolioSelector);
    setupUseSelector();
  });

  describe('opt-in guard', () => {
    it('renders nothing when user is not opted in', () => {
      setupUseSelector({ isOptedIn: false });

      const { queryByTestId } = render(
        <OndoCampaignTierProgress campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_TIER_PROGRESS_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('data guards', () => {
    it('renders nothing when campaign has no tiers', () => {
      setupUseSelector({
        campaigns: [
          createCampaignWithTiers({
            details: { tiers: [] },
          } as Partial<CampaignDto>),
        ],
      });

      const { queryByTestId } = render(
        <OndoCampaignTierProgress campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_TIER_PROGRESS_TEST_IDS.CONTAINER)).toBeNull();
    });

    it('renders nothing when portfolio net deposit is missing', () => {
      setupUseSelector({
        portfolio: createPortfolio(''),
      });

      const { queryByTestId } = render(
        <OndoCampaignTierProgress campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_TIER_PROGRESS_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('tier progress UI', () => {
    it('shows tier progress elements on screen when opted in with tiers and net deposit', () => {
      setupUseSelector({
        portfolio: createPortfolio('7500'),
      });

      const { getByTestId } = render(
        <OndoCampaignTierProgress campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.NET_DEPOSIT),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.PERCENT),
      ).toBeOnTheScreen();
      expect(getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.BAR)).toBeOnTheScreen();
      expect(getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.FILL)).toBeOnTheScreen();
      expect(getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.HELPER)).toBeOnTheScreen();
    });

    it('shows top tier helper copy when net deposit qualifies for last tier', () => {
      setupUseSelector({
        portfolio: createPortfolio('12000'),
      });

      const { getByTestId } = render(
        <OndoCampaignTierProgress campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.HELPER)).toBeOnTheScreen();
      expect(getByTestId(ONDO_TIER_PROGRESS_TEST_IDS.HELPER)).toHaveTextContent(
        "You've reached the top tier",
      );
    });
  });
});
