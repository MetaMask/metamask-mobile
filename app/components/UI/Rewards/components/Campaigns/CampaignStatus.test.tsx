import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignStatus, { CAMPAIGN_STATUS_TEST_IDS } from './CampaignStatus';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatusInfo } from './CampaignTile.utils';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('./CampaignTile.utils', () => ({
  getCampaignStatusInfo: jest.fn().mockReturnValue({
    status: 'active',
    statusLabel: 'Live',
    dateLabel: 'Ends March 15',
    dateLabelIcon: 'Clock',
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  ...jest.requireActual('../../utils/formatUtils'),
  formatUTCDate: jest.fn((_date: string) => 'Fri, April 16'),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'rewards.campaign_status.deposit_window': 'Deposit Window',
      'rewards.campaign_status.deposit_closes': `Closes ${params?.date ?? ''}`,
      'rewards.campaign_status.deposit_closed_on': `Closed on ${params?.date ?? ''}`,
    };
    return translations[key] ?? key;
  },
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  ...overrides,
});

describe('CampaignStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCampaignStatusInfo as jest.Mock).mockReturnValue({
      status: 'active',
      statusLabel: 'Live',
      dateLabel: 'Ends March 15',
      dateLabelIcon: 'Clock',
    });
  });

  it('renders the container', () => {
    const campaign = createTestCampaign();
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(getByTestId(CAMPAIGN_STATUS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders campaign image', () => {
    const campaign = createTestCampaign({
      image: {
        lightModeUrl: 'https://example.com/light.png',
        darkModeUrl: 'https://example.com/dark.png',
      },
    });
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(getByTestId(CAMPAIGN_STATUS_TEST_IDS.IMAGE)).toBeDefined();
  });

  it('renders status label', () => {
    const campaign = createTestCampaign();
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(
      getByTestId(CAMPAIGN_STATUS_TEST_IDS.STATUS_LABEL),
    ).toHaveTextContent('Live');
  });

  it('renders date label', () => {
    const campaign = createTestCampaign();
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(getByTestId(CAMPAIGN_STATUS_TEST_IDS.DATE_LABEL)).toHaveTextContent(
      /Ends March 15/,
    );
  });

  it('renders howItWorks title when available', () => {
    const campaign = createTestCampaign({
      details: {
        howItWorks: {
          title: 'How it works',
          description: 'Description',
          phases: [],
        },
      },
    });
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(
      getByTestId(CAMPAIGN_STATUS_TEST_IDS.HOW_IT_WORKS_TITLE),
    ).toHaveTextContent('How it works');
  });

  it('does not render howItWorks title when details is null', () => {
    const campaign = createTestCampaign({ details: null });
    const { queryByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(
      queryByTestId(CAMPAIGN_STATUS_TEST_IDS.HOW_IT_WORKS_TITLE),
    ).toBeNull();
  });

  it('does not render howItWorks title when title is empty', () => {
    const campaign = createTestCampaign({
      details: {
        howItWorks: { title: '', description: '', phases: [] },
      },
    });
    const { queryByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(
      queryByTestId(CAMPAIGN_STATUS_TEST_IDS.HOW_IT_WORKS_TITLE),
    ).toBeNull();
  });

  it('renders deposit window with "Closes" when cutoff is in the future', () => {
    const campaign = createTestCampaign({
      details: {
        howItWorks: { title: '', description: '', phases: [] },
        depositCutoffDate: '2099-12-31T00:00:00.000Z',
      },
    });
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    const depositWindow = getByTestId(CAMPAIGN_STATUS_TEST_IDS.DEPOSIT_WINDOW);
    expect(depositWindow).toBeDefined();
    expect(depositWindow).toHaveTextContent(/Deposit Window/);
    expect(depositWindow).toHaveTextContent(/Closes Fri, April 16/);
  });

  it('renders deposit window with "Closed on" when cutoff is in the past', () => {
    const campaign = createTestCampaign({
      details: {
        howItWorks: { title: '', description: '', phases: [] },
        depositCutoffDate: '2000-01-01T00:00:00.000Z',
      },
    });
    const { getByTestId } = render(<CampaignStatus campaign={campaign} />);
    const depositWindow = getByTestId(CAMPAIGN_STATUS_TEST_IDS.DEPOSIT_WINDOW);
    expect(depositWindow).toHaveTextContent(/Closed on Fri, April 16/);
  });

  it('does not render deposit window when depositCutoffDate is absent', () => {
    const campaign = createTestCampaign({
      details: {
        howItWorks: { title: 'Title', description: '', phases: [] },
      },
    });
    const { queryByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(queryByTestId(CAMPAIGN_STATUS_TEST_IDS.DEPOSIT_WINDOW)).toBeNull();
  });

  it('does not render deposit window when details is null', () => {
    const campaign = createTestCampaign({ details: null });
    const { queryByTestId } = render(<CampaignStatus campaign={campaign} />);
    expect(queryByTestId(CAMPAIGN_STATUS_TEST_IDS.DEPOSIT_WINDOW)).toBeNull();
  });

  it('calls getCampaignStatusInfo with campaign', () => {
    const campaign = createTestCampaign();
    render(<CampaignStatus campaign={campaign} />);
    expect(getCampaignStatusInfo).toHaveBeenCalledWith(campaign);
  });
});
