import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import TronStakingLearnMoreModal from '.';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    STAKE_LEARN_MORE_CLICKED: 'STAKE_LEARN_MORE_CLICKED',
  },
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../../../util/trace', () => ({
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
  TraceName: {
    EarnFaq: 'EarnFaq',
    EarnFaqApys: 'EarnFaqApys',
  },
}));

const mockUseTronStakeApy = jest.fn();

jest.mock('../../../hooks/useTronStakeApy', () => ({
  __esModule: true,
  default: () => mockUseTronStakeApy(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'stake.trx_learn_more.title': 'Stake TRX and earn',
      'stake.trx_learn_more.stake_any_amount': 'Stake any amount of TRX.',
      'stake.no_minimum_required': 'No minimum required.',
      'stake.trx_learn_more.earn_trx_rewards': 'Earn TRX rewards.',
      'stake.trx_learn_more.earn_trx_rewards_description':
        'Start earning as soon as you stake. Rewards accrue automatically.',
      'stake.flexible_unstaking': 'Flexible unstaking.',
      'stake.trx_learn_more.flexible_unstaking_description':
        'Unstake anytime. Unstaking takes 14 days to process.',
      'stake.disclaimer':
        'Staking does not guarantee rewards, and involves risks including a loss of funds.',
      'stake.learn_more': 'Learn more',
      'stake.got_it': 'Got it',
      'stake.apr': 'APR',
    };
    return translations[key] ?? key;
  },
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <TronStakingLearnMoreModal />
    </SafeAreaProvider>,
  );

describe('TronStakingLearnMoreModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTronStakeApy.mockReturnValue({
      apyPercent: '4.5%',
      isLoading: false,
      apyDecimal: '4.5',
      errorMessage: null,
      refetch: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('renders modal title text', () => {
      const { getByText } = renderModal();

      expect(getByText('Stake TRX and earn')).toBeOnTheScreen();
    });

    it('displays APY percentage when loaded', () => {
      const { getByText } = renderModal();

      expect(getByText('4.5%')).toBeOnTheScreen();
      expect(getByText('APR')).toBeOnTheScreen();
    });

    it('does not display APY when apyPercent is null', () => {
      mockUseTronStakeApy.mockReturnValue({
        apyPercent: null,
        isLoading: false,
        apyDecimal: null,
        errorMessage: null,
        refetch: jest.fn(),
      });

      const { queryByText } = renderModal();

      expect(queryByText('APR')).toBeNull();
    });

    it('renders stake any amount text', () => {
      const { getByText } = renderModal();

      expect(getByText(/Stake any amount of TRX/)).toBeOnTheScreen();
      expect(getByText(/No minimum required/)).toBeOnTheScreen();
    });

    it('renders earn rewards text', () => {
      const { getByText } = renderModal();

      expect(getByText(/Earn TRX rewards/)).toBeOnTheScreen();
      expect(getByText(/Start earning as soon as you stake/)).toBeOnTheScreen();
    });

    it('renders flexible unstaking text', () => {
      const { getByText } = renderModal();

      expect(getByText(/Flexible unstaking/)).toBeOnTheScreen();
      expect(
        getByText(/Unstake anytime. Unstaking takes 14 days/),
      ).toBeOnTheScreen();
    });

    it('renders disclaimer text', () => {
      const { getByText } = renderModal();

      expect(
        getByText(
          'Staking does not guarantee rewards, and involves risks including a loss of funds.',
        ),
      ).toBeOnTheScreen();
    });

    it('renders footer buttons', () => {
      const { getByText } = renderModal();

      expect(getByText('Learn more')).toBeOnTheScreen();
      expect(getByText('Got it')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('navigates to webview when Learn More button is pressed', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText('Learn more'));

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.metamask.io/metamask-portfolio/move-crypto/stake/',
        },
      });
    });

    it('tracks analytics event when Learn More button is pressed', () => {
      const { getByText } = renderModal();

      fireEvent.press(getByText('Learn more'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'STAKE_LEARN_MORE_CLICKED',
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('tracing', () => {
    it('calls trace on mount with EarnFaqApys', () => {
      renderModal();

      expect(mockTrace).toHaveBeenCalledWith({
        name: 'EarnFaqApys',
        data: { experience: 'POOLED_STAKING' },
      });
    });

    it('calls endTrace for EarnFaq on mount', () => {
      renderModal();

      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'EarnFaq' });
    });

    it('calls endTrace for EarnFaqApys when APY is loaded', () => {
      renderModal();

      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'EarnFaqApys' });
    });

    it('does not call endTrace for EarnFaqApys when still loading', () => {
      mockUseTronStakeApy.mockReturnValue({
        apyPercent: null,
        isLoading: true,
        apyDecimal: null,
        errorMessage: null,
        refetch: jest.fn(),
      });

      mockEndTrace.mockClear();
      renderModal();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'EarnFaq' });
    });
  });
});
