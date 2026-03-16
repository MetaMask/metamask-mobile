import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignActivityItem from './CampaignActivityItem';
import {
  selectCampaignProgress,
  selectCampaignDaysLeft,
  selectCampaignActivityType,
} from '../../../../../reducers/rewards/selectors';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      success: { default: 'green' },
      border: { muted: 'lightgray' },
      primary: { muted: 'lightblue', default: 'blue' },
    },
  }),
}));

jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectCampaignProgress: jest.fn(),
  selectCampaignDaysLeft: jest.fn(),
  selectCampaignActivityType: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'rewards.campaign.activity_type_hold': 'Hold',
      'rewards.campaign.days_left': `${params?.count ?? ''} days left`,
    };
    return translations[key] || key;
  },
}));

jest.mock('react-native-progress/Bar', () => {
  const { View } = jest.requireActual('react-native');
  return (props: { testID?: string }) => (
    <View testID={props.testID ?? 'progress-bar'} />
  );
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectProgress = selectCampaignProgress as jest.MockedFunction<
  typeof selectCampaignProgress
>;
const mockSelectDaysLeft = selectCampaignDaysLeft as jest.MockedFunction<
  typeof selectCampaignDaysLeft
>;
const mockSelectActivityType =
  selectCampaignActivityType as jest.MockedFunction<
    typeof selectCampaignActivityType
  >;

const CAMPAIGN_ID = 'campaign-1';

function setupSelectors({
  progress = 0.75,
  daysLeft = 3,
  activityType = 'Hold',
}: {
  progress?: number | null;
  daysLeft?: number | null;
  activityType?: string | null;
} = {}) {
  const progressSelector = jest.fn().mockReturnValue(progress);
  const daysLeftSelector = jest.fn().mockReturnValue(daysLeft);
  const activityTypeSelector = jest.fn().mockReturnValue(activityType);

  mockSelectProgress.mockReturnValue(progressSelector);
  mockSelectDaysLeft.mockReturnValue(daysLeftSelector);
  mockSelectActivityType.mockReturnValue(activityTypeSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === progressSelector) return progress;
    if (selector === daysLeftSelector) return daysLeft;
    if (selector === activityTypeSelector) return activityType;
    return undefined;
  });
}

const defaultProps = {
  campaignId: CAMPAIGN_ID,
  assetSymbol: 'ONDO',
  usdValue: '$3,750',
  sharesLabel: '8.23 shares',
};

describe('CampaignActivityItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
  });

  it('renders with correct testID', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId(`campaign-activity-item-${CAMPAIGN_ID}`)).toBeDefined();
  });

  it('renders asset symbol', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-symbol')).toHaveTextContent(
      'ONDO',
    );
  });

  it('renders shares label', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-shares')).toHaveTextContent(
      '8.23 shares',
    );
  });

  it('renders USD value', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-usd-value')).toHaveTextContent(
      '$3,750',
    );
  });

  it('renders progress bar', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-progress-bar')).toBeDefined();
  });

  it('renders activity type label', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(
      getByTestId('campaign-activity-item-activity-type'),
    ).toHaveTextContent('Hold');
  });

  it('renders days left', () => {
    setupSelectors({ daysLeft: 3 });
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-days-left')).toHaveTextContent(
      '3 days left',
    );
  });

  it('does not render days left when daysLeft is 0', () => {
    setupSelectors({ daysLeft: 0 });
    const { queryByTestId } = render(
      <CampaignActivityItem {...defaultProps} />,
    );
    expect(queryByTestId('campaign-activity-item-days-left')).toBeNull();
  });

  it('does not render days left when daysLeft is null', () => {
    setupSelectors({ daysLeft: null });
    const { queryByTestId } = render(
      <CampaignActivityItem {...defaultProps} />,
    );
    expect(queryByTestId('campaign-activity-item-days-left')).toBeNull();
  });

  it('does not render activity type when null', () => {
    setupSelectors({ activityType: null });
    const { queryByTestId } = render(
      <CampaignActivityItem {...defaultProps} />,
    );
    expect(queryByTestId('campaign-activity-item-activity-type')).toBeNull();
  });

  it('renders asset icon when assetIconUrl is provided', () => {
    const { getByTestId } = render(
      <CampaignActivityItem
        {...defaultProps}
        assetIconUrl="https://example.com/icon.png"
      />,
    );
    expect(getByTestId('campaign-activity-item-icon')).toBeDefined();
  });

  it('renders fallback initials when assetIconUrl is not provided', () => {
    const { getByTestId } = render(<CampaignActivityItem {...defaultProps} />);
    expect(getByTestId('campaign-activity-item-icon-fallback')).toBeDefined();
  });

  it('renders first 2 chars of symbol as fallback initials', () => {
    const { getByTestId } = render(
      <CampaignActivityItem {...defaultProps} assetSymbol="ONDO" />,
    );
    expect(
      getByTestId('campaign-activity-item-icon-fallback'),
    ).toHaveTextContent('ON');
  });

  it('calls selectors with correct campaignId', () => {
    render(<CampaignActivityItem {...defaultProps} campaignId="abc-123" />);
    expect(mockSelectProgress).toHaveBeenCalledWith('abc-123');
    expect(mockSelectDaysLeft).toHaveBeenCalledWith('abc-123');
    expect(mockSelectActivityType).toHaveBeenCalledWith('abc-123');
  });
});
