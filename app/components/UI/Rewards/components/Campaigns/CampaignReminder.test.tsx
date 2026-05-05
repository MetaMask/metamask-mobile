import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignReminder from './CampaignReminder';
import { reminderStorageKeyForComposite } from '../../hooks/useCampaignReminderSubscriptions';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockShowToast = jest.fn();

const TEST_REWARDS_SUBSCRIPTION_ID = 'test-rewards-sub-id';

const mockGetItemSync = jest.fn((_key: string): string | null => null);
const mockSetItem = jest.fn(
  (_key: string, _value: string): Promise<void> => Promise.resolve(),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockGetItemSync(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: jest.fn((title: string, subtitle?: string) => ({
        variant: 'success',
        title,
        subtitle,
      })),
      error: jest.fn((title: string, subtitle?: string) => ({
        variant: 'error',
        title,
        subtitle,
      })),
      entriesClosed: jest.fn(),
    },
  })),
}));

jest.mock('../../../../../images/rewards/notification.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-reminder-svg' }),
  };
});

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
      'rewards.campaign.up_next': 'Up next',
      'rewards.campaign.notify_me': 'Notify me',
      'rewards.campaign.remind_me_success_toast': 'We will notify you.',
      'rewards.campaign.remind_me_save_error': 'Save failed.',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-reminder-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Preview Campaign',
  startDate: '2028-01-01T00:00:00.000Z',
  endDate: '2028-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  ...overrides,
});

describe('CampaignReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return TEST_REWARDS_SUBSCRIPTION_ID;
      }
      return undefined;
    });
    mockCreateEventBuilder.mockImplementation(() => {
      const builder = {
        addProperties: jest.fn(),
        build: jest.fn(() => ({})),
      };
      (builder.addProperties as jest.Mock).mockReturnValue(builder);
      return builder;
    });
  });

  it('renders up next label and campaign name', async () => {
    const campaign = createTestCampaign({ name: 'My Upcoming Campaign' });
    const { getByText, getByTestId } = render(
      <CampaignReminder campaign={campaign} />,
    );

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-campaign-reminder-1'),
      ).toBeOnTheScreen();
    });
    expect(getByText('Up next')).toBeOnTheScreen();
    expect(getByText('My Upcoming Campaign')).toBeOnTheScreen();
    expect(getByText('Notify me')).toBeOnTheScreen();
  });

  it('tracks reminder subscribed when Notify me is pressed', async () => {
    const campaign = createTestCampaign({ id: 'cr-analytics' });
    const { getByTestId } = render(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-cr-analytics'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByTestId('campaign-reminder-notify-cr-analytics'));
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      reminderStorageKeyForComposite(
        `${TEST_REWARDS_SUBSCRIPTION_ID}:cr-analytics`,
      ),
      '1',
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});
