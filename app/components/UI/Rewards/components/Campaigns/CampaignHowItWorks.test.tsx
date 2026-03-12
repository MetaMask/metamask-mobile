import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignHowItWorks, {
  CAMPAIGN_HOW_IT_WORKS_TEST_IDS,
} from './CampaignHowItWorks';
import type { OndoCampaignHowItWorks } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign_details.how_it_works': 'How it works',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../utils/formatUtils', () => {
  const { IconName } = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  return {
    getIconName: jest.fn(() => IconName.Star),
  };
});

const createHowItWorks = (
  overrides: Partial<OndoCampaignHowItWorks> = {},
): OndoCampaignHowItWorks => ({
  title: 'How it works',
  description: 'Campaign description',
  phases: [
    {
      name: 'Phase 1',
      daysLabel: 'Days 1-30',
      sortOrder: 1,
      steps: [
        {
          title: 'Buy ONDO',
          description: 'Purchase ONDO tokens',
          iconName: 'Swap',
        },
      ],
    },
  ],
  ...overrides,
});

describe('CampaignHowItWorks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    const howItWorks = createHowItWorks();
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the section title', () => {
    const howItWorks = createHowItWorks();
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE)).toHaveTextContent(
      'How it works',
    );
  });

  it('renders phase chip with daysLabel', () => {
    const howItWorks = createHowItWorks();
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE_CHIP}-0`),
    ).toHaveTextContent('Days 1-30');
  });

  it('renders step title and description', () => {
    const howItWorks = createHowItWorks();
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-0-0`),
    ).toHaveTextContent('Buy ONDO');
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_DESCRIPTION}-0-0`),
    ).toHaveTextContent('Purchase ONDO tokens');
  });

  it('renders step icon', () => {
    const howItWorks = createHowItWorks();
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_ICON}-0-0`),
    ).toBeDefined();
  });

  it('renders phases sorted by sortOrder', () => {
    const howItWorks = createHowItWorks({
      phases: [
        {
          name: 'Phase 2',
          daysLabel: 'Days 31-60',
          sortOrder: 2,
          steps: [
            {
              title: 'Hold tokens',
              description: 'Keep holding',
              iconName: 'Clock',
            },
          ],
        },
        {
          name: 'Phase 1',
          daysLabel: 'Days 1-30',
          sortOrder: 1,
          steps: [
            {
              title: 'Buy ONDO',
              description: 'Purchase tokens',
              iconName: 'Swap',
            },
          ],
        },
      ],
    });

    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );

    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE_CHIP}-0`),
    ).toHaveTextContent('Days 1-30');
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE_CHIP}-1`),
    ).toHaveTextContent('Days 31-60');
  });

  it('renders multiple steps within a phase', () => {
    const howItWorks = createHowItWorks({
      phases: [
        {
          name: 'Phase 1',
          daysLabel: 'Days 1-30',
          sortOrder: 1,
          steps: [
            {
              title: 'Step One',
              description: 'First step',
              iconName: 'Swap',
            },
            {
              title: 'Step Two',
              description: 'Second step',
              iconName: 'Clock',
            },
          ],
        },
      ],
    });

    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );

    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-0-0`),
    ).toHaveTextContent('Step One');
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-0-1`),
    ).toHaveTextContent('Step Two');
  });

  it('renders no phases when phases array is empty', () => {
    const howItWorks = createHowItWorks({ phases: [] });
    const { getByTestId, queryByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE)).toBeDefined();
    expect(
      queryByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE}-0`),
    ).toBeNull();
  });
});
