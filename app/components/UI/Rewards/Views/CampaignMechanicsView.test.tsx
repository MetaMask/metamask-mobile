import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignMechanicsView, {
  CAMPAIGN_MECHANICS_TEST_IDS,
} from './CampaignMechanicsView';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { campaignId: 'campaign-1' } }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/Campaigns/CampaignHowItWorks', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-how-it-works' }),
  };
});

jest.mock('../components/ContentfulRichText/ContentfulRichText', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');
  const isDocumentFn = (value: unknown): boolean =>
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).nodeType === 'document' &&
    'content' in (value as Record<string, unknown>) &&
    Array.isArray((value as Record<string, unknown>).content);
  return {
    __esModule: true,
    isDocument: isDocumentFn,
    default: ({
      document: doc,
      testID,
    }: {
      document: unknown;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(RNText, null, JSON.stringify(doc)),
      ),
  };
});

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign_mechanics.title': 'How it works',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  ...overrides,
});

const emptyCategorized = { active: [], upcoming: [], previous: [] };
const hookDefaults = {
  campaigns: [],
  categorizedCampaigns: emptyCategorized,
  isLoading: false,
  hasError: false,
  hasLoaded: false,
  fetchCampaigns: jest.fn(),
};

describe('CampaignMechanicsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue(hookDefaults);
  });

  it('renders the container', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the header title', () => {
    const { getByText } = render(<CampaignMechanicsView />);
    expect(getByText('How it works')).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    fireEvent.press(getByTestId('campaign-mechanics-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('howItWorks section', () => {
    it('renders the howItWorks section when campaign has howItWorks', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
              },
            },
          }),
        ],
      });
      const { getByTestId } = render(<CampaignMechanicsView />);
      expect(
        getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION),
      ).toBeDefined();
      expect(getByTestId('campaign-how-it-works')).toBeDefined();
    });

    it('does not render howItWorks section when campaign has no details', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign({ details: null })],
      });
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION),
      ).toBeNull();
    });

    it('does not render howItWorks section when campaign is not found', () => {
      // No campaigns in list → useMemo returns null
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION),
      ).toBeNull();
    });
  });

  describe('notes section', () => {
    const richTextNotes = {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            { nodeType: 'text', value: 'Important notes', marks: [], data: {} },
          ],
        },
      ],
    };

    it('renders notes section with ContentfulRichText when notes is present', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
                notes: richTextNotes,
              },
            },
          }),
        ],
      });
      const { getByTestId } = render(<CampaignMechanicsView />);
      expect(
        getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
      ).toBeDefined();
    });

    it('does not render notes section when notes is null', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
                notes: null,
              },
            },
          }),
        ],
      });
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
      ).toBeNull();
    });

    it('does not render notes section when howItWorks has no notes field', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
              },
            },
          }),
        ],
      });
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
      ).toBeNull();
    });

    it('does not render notes section when notes is a non-document object', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
                notes: { title: 'Only title' },
              },
            },
          }),
        ],
      });
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
      ).toBeNull();
    });

    it('does not render notes section when notes is a string', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Earn rewards',
                steps: [],
                notes: 'just a string',
              },
            },
          }),
        ],
      });
      const { queryByTestId } = render(<CampaignMechanicsView />);
      expect(
        queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
      ).toBeNull();
    });
  });
});
