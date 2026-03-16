import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignPhaseProgress, {
  CAMPAIGN_PHASE_PROGRESS_TEST_IDS,
  computePhaseProgressList,
} from './CampaignPhaseProgress';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      success: { default: 'green' },
      border: { muted: 'lightgray' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.campaign.days_left') {
      return `${params?.count ?? ''} days left`;
    }
    if (key === 'rewards.campaign.starts_day') {
      return `Starts day ${params?.day ?? ''}`;
    }
    return key;
  },
}));

jest.mock('react-native-progress/Bar', () => {
  const { View } = jest.requireActual('react-native');
  return (props: { testID?: string }) => (
    <View testID={props.testID ?? 'progress-bar'} />
  );
});

/** Campaign spanning 30 days starting on Jan 1, 2025 */
const CAMPAIGN_START = new Date('2025-01-01T00:00:00.000Z').getTime();
const CAMPAIGN_END = new Date('2025-01-31T00:00:00.000Z').getTime();

function makeCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'campaign-1',
    type: CampaignType.ONDO_HOLDING,
    name: 'Test Campaign',
    startDate: new Date(CAMPAIGN_START).toISOString(),
    endDate: new Date(CAMPAIGN_END).toISOString(),
    statusLabel: 'Live',
    termsAndConditions: null,
    excludedRegions: [],
    details: {
      image: { lightModeUrl: '', darkModeUrl: '' },
      howItWorks: {
        title: 'How it works',
        description: 'Description',
        phases: [
          {
            name: 'Swap',
            daysLabel: 'Day 1 - 15',
            sortOrder: 1,
            steps: [],
          },
          {
            name: 'Hold',
            daysLabel: 'Day 16 - 30',
            sortOrder: 2,
            steps: [],
          },
        ],
      },
    },
    ...overrides,
  };
}

describe('computePhaseProgressList', () => {
  it('returns null when campaign has no details', () => {
    const campaign = makeCampaign({ details: null });
    expect(computePhaseProgressList(campaign)).toBeNull();
  });

  it('returns null when phases array is empty', () => {
    const campaign = makeCampaign({
      details: {
        image: { lightModeUrl: '', darkModeUrl: '' },
        howItWorks: {
          title: '',
          description: '',
          phases: [],
        },
      },
    });
    expect(computePhaseProgressList(campaign)).toBeNull();
  });

  it('returns null when campaign duration is zero or negative', () => {
    const campaign = makeCampaign({
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-01T00:00:00.000Z',
    });
    expect(computePhaseProgressList(campaign)).toBeNull();
  });

  it('marks phase 1 as active during the first half of the campaign', () => {
    // Day 8 of a 30-day campaign with 2 phases (phases are 15 days each)
    const day8 = CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(day8);

    const result = computePhaseProgressList(makeCampaign());
    if (!result) throw new Error('Expected non-null result');
    expect(result[0].isActive).toBe(true);
    expect(result[0].isPast).toBe(false);
    expect(result[1].isActive).toBe(false);
    expect(result[1].isPast).toBe(false);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('marks phase 2 as active during the second half of the campaign', () => {
    // Day 18 of a 30-day campaign
    const day18 = CAMPAIGN_START + 17 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(day18);

    const result = computePhaseProgressList(makeCampaign());
    if (!result) throw new Error('Expected non-null result');
    expect(result[0].isActive).toBe(false);
    expect(result[0].isPast).toBe(true);
    expect(result[1].isActive).toBe(true);
    expect(result[1].isPast).toBe(false);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('computes progress ~0.5 at the midpoint of phase 1', () => {
    // Day 7.5 = midpoint of phase 1 (days 1-15)
    const midPhase1 = CAMPAIGN_START + 7.5 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(midPhase1);

    const result = computePhaseProgressList(makeCampaign());
    if (!result) throw new Error('Expected non-null result');
    expect(result[0].progress).toBeCloseTo(0.5, 1);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('active phase label shows days left', () => {
    // Day 8: 7 days left in phase 1 (phase ends at day 16 = start + 15 days)
    const day8 = CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(day8);

    const result = computePhaseProgressList(makeCampaign());
    if (!result) throw new Error('Expected non-null result');
    expect(result[0].label).toContain('days left');

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('upcoming phase label shows starts day', () => {
    const day8 = CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(day8);

    const result = computePhaseProgressList(makeCampaign());
    if (!result) throw new Error('Expected non-null result');
    expect(result[1].label).toContain('Starts day');

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('sorts phases by sortOrder regardless of array order', () => {
    const campaign = makeCampaign({
      details: {
        image: { lightModeUrl: '', darkModeUrl: '' },
        howItWorks: {
          title: '',
          description: '',
          phases: [
            { name: 'Hold', daysLabel: 'Day 16-30', sortOrder: 2, steps: [] },
            { name: 'Swap', daysLabel: 'Day 1-15', sortOrder: 1, steps: [] },
          ],
        },
      },
    });

    // Before campaign starts - both upcoming
    jest.spyOn(Date, 'now').mockReturnValue(CAMPAIGN_START - 1000);
    const result = computePhaseProgressList(campaign);
    if (!result) throw new Error('Expected non-null result');
    expect(result[0].phase.name).toBe('Swap');
    expect(result[1].phase.name).toBe('Hold');

    jest.spyOn(Date, 'now').mockRestore();
  });
});

describe('CampaignPhaseProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when campaign has no phases', () => {
    const campaign = makeCampaign({ details: null });
    const { queryByTestId } = render(
      <CampaignPhaseProgress campaign={campaign} />,
    );
    expect(
      queryByTestId(CAMPAIGN_PHASE_PROGRESS_TEST_IDS.CONTAINER),
    ).toBeNull();
  });

  it('renders the container when phases exist', () => {
    // Day 8 of campaign
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000);

    const { getByTestId } = render(
      <CampaignPhaseProgress campaign={makeCampaign()} />,
    );
    expect(
      getByTestId(CAMPAIGN_PHASE_PROGRESS_TEST_IDS.CONTAINER),
    ).toBeDefined();

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('renders phase names', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000);

    const { getByTestId } = render(
      <CampaignPhaseProgress campaign={makeCampaign()} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_NAME}-0`),
    ).toHaveTextContent('Swap');
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_NAME}-1`),
    ).toHaveTextContent('Hold');

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('renders progress bars for each phase', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000);

    const { getByTestId } = render(
      <CampaignPhaseProgress campaign={makeCampaign()} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_BAR}-0`),
    ).toBeDefined();
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_BAR}-1`),
    ).toBeDefined();

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('renders time labels for active and upcoming phases', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(CAMPAIGN_START + 7 * 24 * 60 * 60 * 1000);

    const { getByTestId } = render(
      <CampaignPhaseProgress campaign={makeCampaign()} />,
    );
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_LABEL}-0`),
    ).toHaveTextContent(/days left/);
    expect(
      getByTestId(`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_LABEL}-1`),
    ).toHaveTextContent(/Starts day/);

    jest.spyOn(Date, 'now').mockRestore();
  });
});
