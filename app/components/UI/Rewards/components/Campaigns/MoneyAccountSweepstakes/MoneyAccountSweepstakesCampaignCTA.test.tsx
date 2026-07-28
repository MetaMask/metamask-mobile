import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignCTA from './MoneyAccountSweepstakesCampaignCTA';
import { CAMPAIGN_CTA_TEST_IDS } from '../CampaignOptInCta';
import {
  CampaignType,
  type CampaignDto,
  type MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
let mockIsGeoRestricted = false;
let mockIsGeoLoading = false;
let mockOptedInAny = false;
let mockIsParticipationLoading = false;
const mockEnsureOptedIn = jest.fn(async () => true);
const mockShowToast = jest.fn();
const mockEntriesClosed = jest.fn(() => ({ variant: 'icon' }));

let latestOptInSheetProps: {
  title?: string;
  onOptIn?: () => Promise<boolean>;
  onClose?: () => void;
} | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (..._args: unknown[]) => ({}) }),
}));

jest.mock('../../../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: () => ({
    isGeoRestricted: mockIsGeoRestricted,
    isGeoLoading: mockIsGeoLoading,
  }),
}));

jest.mock('../../../hooks/useMoneyAccountSweepstakesParticipation', () => ({
  useMoneyAccountSweepstakesParticipation: () => ({
    optedInAny: mockOptedInAny,
    isLoading: mockIsParticipationLoading,
  }),
}));

jest.mock('../../../hooks/useMoneyAccountSweepstakesOptIn', () => ({
  useMoneyAccountSweepstakesOptIn: () => ({
    ensureOptedIn: mockEnsureOptedIn,
  }),
}));

jest.mock('../../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      entriesClosed: mockEntriesClosed,
    },
  }),
}));

jest.mock('../CampaignOptInSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: {
      title: string;
      onOptIn: () => Promise<boolean>;
      onClose: () => void;
    }) => {
      latestOptInSheetProps = props;
      return ReactActual.createElement(
        View,
        { testID: 'campaign-opt-in-sheet' },
        ReactActual.createElement(Pressable, {
          testID: 'campaign-opt-in-sheet-close',
          onPress: props.onClose,
        }),
      );
    },
  };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.campaign.geo_locked_cta': 'Check eligibility',
      'rewards.campaign.geo_loading': 'Checking eligibility',
      'rewards.campaign.geo_locked_toast_title': 'Not available in your region',
      'rewards.campaign.geo_locked_toast_description':
        "This campaign isn't available where you are. Check back later for new campaigns.",
    };
    return map[key] ?? key;
  },
}));

const localizedText: MoneyAccountSweepstakesLocalizedTextDto = {
  currentBalanceTitle: 'Current balance',
  currentBalanceDescription: 'Current balance description',
  eligibleBalanceTitle: 'Eligible balance',
  eligibleBalanceDescription: 'Eligible balance description',
  entriesTitle: 'Entries',
  entriesDescription: 'Entries description',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  addFundsTitle: 'Add funds',
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
  drawProofEntriesLabel: 'Entries',
  winnersLabel: 'Winners',
  reservesLabel: 'Reserves',
  originalDrawTitle: 'Original draw',
  reserveSuffix: '(reserve)',
  refLabel: 'Ref',
  weightLabel: 'Weight',
};

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'mas-campaign-1',
    type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    name: 'Money Account Sweepstakes',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    showUpcomingDate: false,
    ...overrides,
  };
}

describe('MoneyAccountSweepstakesCampaignCTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGeoRestricted = false;
    mockIsGeoLoading = false;
    mockOptedInAny = false;
    mockIsParticipationLoading = false;
    mockEnsureOptedIn.mockResolvedValue(true);
    latestOptInSheetProps = null;
  });

  it('renders nothing when series status is not active', () => {
    const { queryByTestId } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="previous"
        localizedText={localizedText}
      />,
    );

    expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('shows geo-locked CTA and toast when region is restricted', () => {
    mockIsGeoRestricted = true;

    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="active"
        localizedText={localizedText}
      />,
    );

    expect(getByText('Check eligibility')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockEntriesClosed).toHaveBeenCalledWith(
      'Not available in your region',
      "This campaign isn't available where you are. Check back later for new campaigns.",
    );
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to add money when already opted in', () => {
    mockOptedInAny = true;

    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="active"
        localizedText={localizedText}
      />,
    );

    expect(getByText('Add funds')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  });

  it('opens the opt-in sheet when not yet opted in', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="active"
        localizedText={localizedText}
      />,
    );

    expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();

    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
    expect(latestOptInSheetProps?.title).toBe('Join the Sweepstakes');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to add money after a successful opt-in sheet close', async () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="active"
        localizedText={localizedText}
      />,
    );

    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
    expect(latestOptInSheetProps?.onOptIn).toBeDefined();

    await latestOptInSheetProps?.onOptIn?.();
    fireEvent.press(getByTestId('campaign-opt-in-sheet-close'));

    expect(mockEnsureOptedIn).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  });

  it('does not navigate when opt-in fails before sheet close', async () => {
    mockEnsureOptedIn.mockResolvedValue(false);

    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignCTA
        campaign={buildCampaign()}
        seriesStatus="active"
        localizedText={localizedText}
      />,
    );

    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
    await latestOptInSheetProps?.onOptIn?.();
    fireEvent.press(getByTestId('campaign-opt-in-sheet-close'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
