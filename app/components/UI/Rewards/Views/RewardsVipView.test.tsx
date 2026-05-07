import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import RewardsVipView from './RewardsVipView';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      dispatch: mockDispatch,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    HeaderStandard: ({ title }: { title: string }) =>
      ReactActual.createElement(Text, null, title),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip.title': 'VIP',
    };
    return translations[key] || key;
  }),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTrackRewardsPageView =
  useTrackRewardsPageView as jest.MockedFunction<
    typeof useTrackRewardsPageView
  >;

describe('RewardsVipView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return true;
      }
      return undefined;
    });
  });

  it('renders the guarded VIP shell for VIP users', () => {
    const { getByTestId, getByText } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIEW_SELECTORS.VIP_VIEW)).toBeOnTheScreen();
    expect(getByText('VIP')).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: true,
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('redirects subscribed non-VIP users to the rewards dashboard', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return false;
      }
      return undefined;
    });

    const { queryByTestId } = render(<RewardsVipView />);

    expect(queryByTestId(REWARDS_VIEW_SELECTORS.VIP_VIEW)).toBeNull();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: false,
    });
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.REWARDS_DASHBOARD),
      );
    });
  });
});
