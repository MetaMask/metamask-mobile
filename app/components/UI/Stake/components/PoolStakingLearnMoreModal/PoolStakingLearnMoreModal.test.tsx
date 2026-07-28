import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PoolStakingLearnMoreModal from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/stakeMockData';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_DAILY_APYS,
} from './mockVaultRewards';
import { AreaChart } from 'react-native-svg-charts';
import { fireLayoutEvent } from '../../../../../util/testUtils/react-native-svg-charts';
import { INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID } from './InteractiveTimespanChart';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: jest.fn().mockReturnValue({ params: { chainId: '1' } }),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

jest.mock('../../hooks/useVaultApyAverages', () => ({
  __esModule: true,
  default: () => ({
    vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
    isLoadingVaultApyAverages: false,
    refreshVaultApyAverages: jest.fn(),
  }),
}));

jest.mock('../../hooks/useVaultApys', () => ({
  __esModule: true,
  default: () => ({
    vaultApys: MOCK_VAULT_DAILY_APYS,
    isLoadingVaultApys: false,
    refreshVaultApys: jest.fn(),
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <PoolStakingLearnMoreModal />
    </SafeAreaProvider>,
  );

describe('PoolStakingLearnMoreModal', () => {
  let mockHook: ReturnType<typeof createMockUseAnalyticsHook>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = createMockUseAnalyticsHook({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    jest.mocked(useAnalytics).mockReturnValue(mockHook);
  });

  it('renders chart container', async () => {
    const { getByTestId } = renderModal();

    const chartContainer = getByTestId(
      INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID,
    );
    const areaChart = chartContainer.find((child) => child.type === AreaChart);

    fireLayoutEvent(areaChart);

    expect(
      getByTestId(INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID),
    ).toBeOnTheScreen();
  });

  describe('interactions', () => {
    it('navigates to webview when Learn More button is pressed', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText(strings('stake.learn_more')));

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: POOLED_STAKING_FAQ_URL,
        },
      });
    });

    it('closes the bottom sheet before navigating to webview', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText(strings('stake.learn_more')));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockGoBack.mock.invocationCallOrder[0]).toBeLessThan(
        mockNavigate.mock.invocationCallOrder[0],
      );
    });

    it('tracks analytics event when Learn More button is pressed', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText(strings('stake.learn_more')));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks analytics event with stake learn more modal properties', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText(strings('stake.learn_more')));

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        selected_provider: 'consensys',
        text: 'Learn More',
        location: 'LearnMoreModal',
      });
    });

    it('closes the bottom sheet when Got it button is pressed', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText(strings('stake.got_it')));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
