import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignHowItWorks, {
  CAMPAIGN_HOW_IT_WORKS_TEST_IDS,
} from './CampaignHowItWorks';
import type { OndoCampaignHowItWorks } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    // Icon maps its name prop to an SVG component via enum lookup; mock it to
    // avoid "type is invalid" errors when getIconName returns a plain string.
    Icon: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../utils/formatUtils', () => ({
  getIconName: (name: string) => name,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign_details.how_it_works': 'How it works',
    };
    return translations[key] || key;
  },
}));

const createHowItWorks = (
  overrides: Partial<OndoCampaignHowItWorks> = {},
): OndoCampaignHowItWorks => ({
  title: 'How it works',
  description: 'Hold tokens to earn rewards',
  steps: [
    {
      iconName: 'star',
      title: 'Step 1',
      description: 'Do step 1',
    },
  ],
  ...overrides,
});

describe('CampaignHowItWorks', () => {
  it('renders the container', () => {
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={createHowItWorks()} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the title', () => {
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={createHowItWorks()} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE)).toHaveTextContent(
      'How it works',
    );
  });

  it('renders a step title and description', () => {
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={createHowItWorks()} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-0`),
    ).toHaveTextContent('Step 1');
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_DESCRIPTION}-0`),
    ).toHaveTextContent('Do step 1');
  });

  it('renders multiple steps', () => {
    const howItWorks = createHowItWorks({
      steps: [
        { iconName: 'star', title: 'Step A', description: 'Desc A' },
        { iconName: 'circle', title: 'Step B', description: 'Desc B' },
      ],
    });
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-0`),
    ).toHaveTextContent('Step A');
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-1`),
    ).toHaveTextContent('Step B');
  });

  it('renders gracefully with no steps', () => {
    const howItWorks = createHowItWorks({ steps: [] });
    const { getByTestId, queryByTestId } = render(
      <CampaignHowItWorks howItWorks={howItWorks} />,
    );
    expect(getByTestId(CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      queryByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP}-0`),
    ).toBeNull();
  });

  it('renders step icon for each step', () => {
    const { getByTestId } = render(
      <CampaignHowItWorks howItWorks={createHowItWorks()} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_ICON}-0`),
    ).toBeDefined();
  });
});
