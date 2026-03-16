import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import CampaignMechanicsView, {
  CAMPAIGN_MECHANICS_TEST_IDS,
} from './CampaignMechanicsView';
import {
  selectCampaignHowItWorks,
  selectCampaignNotes,
} from '../../../../reducers/rewards/selectors';
import type {
  OndoCampaignHowItWorks,
  OndoCampaignNotes,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignHowItWorks: jest.fn(),
  selectCampaignNotes: jest.fn(),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    );
  },
);

jest.mock('../components/Campaigns/CampaignHowItWorks', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="mock-how-it-works" />;
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
      style,
    }: {
      children: React.ReactNode;
      testID?: string;
      style?: unknown;
    }) => (
      <View testID={testID} style={style}>
        {children}
      </View>
    ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.campaign_mechanics.title': 'Mechanics',
    };
    return map[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectHowItWorks = selectCampaignHowItWorks as jest.MockedFunction<
  typeof selectCampaignHowItWorks
>;
const mockSelectNotes = selectCampaignNotes as jest.MockedFunction<
  typeof selectCampaignNotes
>;

const CAMPAIGN_ID = 'campaign-1';

const mockHowItWorks: OndoCampaignHowItWorks = {
  title: 'How it works',
  description: 'Description',
  phases: [
    {
      name: 'Phase 1',
      daysLabel: '15 days',
      sortOrder: 1,
      steps: [
        {
          title: 'Opt in',
          description: 'Enter your email.',
          iconName: 'login',
        },
      ],
    },
  ],
};

const mockNotes: OndoCampaignNotes = {
  title: 'What makes a trade eligible?',
  description: "Here's what you need to know.",
  items: [
    { title: 'Minimum swap amount', description: 'At least $100.' },
    { title: 'New positions only', description: 'During the campaign window.' },
  ],
};

function setupSelectors({
  howItWorks = mockHowItWorks,
  notes = mockNotes,
}: {
  howItWorks?: OndoCampaignHowItWorks | null;
  notes?: OndoCampaignNotes | null;
} = {}) {
  const howItWorksSelector = jest.fn().mockReturnValue(howItWorks);
  const notesSelector = jest.fn().mockReturnValue(notes);
  mockSelectHowItWorks.mockReturnValue(howItWorksSelector);
  mockSelectNotes.mockReturnValue(notesSelector);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === howItWorksSelector) return howItWorks;
    if (selector === notesSelector) return notes;
    return undefined;
  });
}

describe('CampaignMechanicsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      navigate: jest.fn(),
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { campaignId: CAMPAIGN_ID },
    });
    setupSelectors();
  });

  it('renders the container', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the how it works section when data is available', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION),
    ).toBeDefined();
  });

  it('does not render how it works section when data is null', () => {
    setupSelectors({ howItWorks: null });
    const { queryByTestId } = render(<CampaignMechanicsView />);
    expect(
      queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION),
    ).toBeNull();
  });

  it('renders notes section when data is available', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION),
    ).toBeDefined();
  });

  it('does not render notes section when data is null', () => {
    setupSelectors({ notes: null });
    const { queryByTestId } = render(<CampaignMechanicsView />);
    expect(queryByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION)).toBeNull();
  });

  it('renders notes title', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_TITLE),
    ).toHaveTextContent('What makes a trade eligible?');
  });

  it('renders notes description', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(CAMPAIGN_MECHANICS_TEST_IDS.NOTES_DESCRIPTION),
    ).toHaveTextContent("Here's what you need to know.");
  });

  it('renders all note items', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM}-0`),
    ).toBeDefined();
    expect(
      getByTestId(`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM}-1`),
    ).toBeDefined();
  });

  it('renders note item title and description', () => {
    const { getByTestId } = render(<CampaignMechanicsView />);
    expect(
      getByTestId(`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM_TITLE}-0`),
    ).toHaveTextContent('Minimum swap amount');
    expect(
      getByTestId(`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM_DESCRIPTION}-0`),
    ).toHaveTextContent('At least $100.');
  });

  it('calls selectors with the campaignId from route params', () => {
    render(<CampaignMechanicsView />);
    expect(mockSelectHowItWorks).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mockSelectNotes).toHaveBeenCalledWith(CAMPAIGN_ID);
  });
});
