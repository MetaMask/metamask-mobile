import React from 'react';
import { HistoricLendingMarketApys } from '@metamask/stake-sdk';
import Engine from '../../../../core/Engine';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_USDC_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import LendingLearnMoreModal from '.';
import { fireLayoutEvent } from '../../../../util/testUtils/react-native-svg-charts';
import { INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID } from '../../Stake/components/PoolStakingLearnMoreModal/InteractiveTimespanChart';
import { AreaChart } from 'react-native-svg-charts';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { Linking } from 'react-native';
import { EARN_URLS } from '../constants/urls';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      openURL: jest.fn(),
    },
  };
});

const mockAUsdc = {
  ...MOCK_USDC_MAINNET_ASSET,
  experience: {
    apr: '4.5',
    market: { protocol: LendingProtocol.AAVE, id: '0xabc' },
  },
  balanceFormatted: '6.84314 USDC',
  balanceFiat: '$6.84',
  balanceMinimalUnit: '6.84314',
  balanceFiatNumber: 6.84314,
} as unknown as EarnTokenDetails;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        asset: mockAUsdc,
      },
    }),
  };
});

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingMarketDailyApysAndAverages: jest.fn(),
    },
  },
}));

jest.mock('../hooks/useEarnToken', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    earnToken: {
      symbol: 'USDC',
    },
    outputToken: {
      symbol: 'aUSDC',
    },
    earnTokenPair: {
      outputToken: {
        symbol: 'aUSDC',
      },
    },
    getTokenSnapshot: jest.fn(),
    tokenSnapshot: {
      token: {
        symbol: 'USDC',
      },
    },
  }),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
  MetaMetricsEvents: {
    EARN_LENDING_FAQ_LINK_OPENED: 'EARN_LENDING_FAQ_LINK_OPENED',
  },
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('LendingLearnMoreModal', () => {
  const mockFetchedMarketApys: HistoricLendingMarketApys = {
    netSupplyRate: 3.579795903527685,
    totalSupplyRate: 3.579795903527685,
    averageRates: {
      ninetyDay: {
        netSupplyRate: 2.7186257067406783,
        totalSupplyRate: 2.7186257067406783,
      },
      sevenDay: {
        netSupplyRate: 3.2758607620753546,
        totalSupplyRate: 3.2758607620753546,
      },
      thirtyDay: {
        netSupplyRate: 3.0410185725176015,
        totalSupplyRate: 3.0410185725176015,
      },
    },
    historicalRates: [
      {
        netSupplyRate: 3.579795903527685,
        timestamp: 1749845723,
        totalSupplyRate: 3.579795903527685,
      },
      {
        netSupplyRate: 3.525348708943486,
        timestamp: 1749772667,
        totalSupplyRate: 3.525348708943486,
      },
      {
        netSupplyRate: 3.3445581744195385,
        timestamp: 1749684203,
        totalSupplyRate: 3.3445581744195385,
      },
      {
        netSupplyRate: 3.1116034207365524,
        timestamp: 1749599939,
        totalSupplyRate: 3.1116034207365524,
      },
      {
        netSupplyRate: 3.1039364087751973,
        timestamp: 1749513359,
        totalSupplyRate: 3.1039364087751973,
      },
      {
        netSupplyRate: 3.079920543192482,
        timestamp: 1749423911,
        totalSupplyRate: 3.079920543192482,
      },
      {
        netSupplyRate: 3.185862174932541,
        timestamp: 1749339983,
        totalSupplyRate: 3.185862174932541,
      },
    ],
  };

  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (
      Engine.context.EarnController
        .getLendingMarketDailyApysAndAverages as jest.MockedFunction<
        typeof Engine.context.EarnController.getLendingMarketDailyApysAndAverages
      >
    ).mockResolvedValue(mockFetchedMarketApys);
  });

  it('render lending history apy chart', async () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <LendingLearnMoreModal />
      </SafeAreaProvider>,
      { state: mockInitialState },
    );

    await waitFor(async () => {
      const chartContainer = getByTestId(
        INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID,
      );
      const areaChart = chartContainer.find(
        (child) => child.type === AreaChart,
      );

      fireLayoutEvent(areaChart);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('navigates to learn more link', async () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <LendingLearnMoreModal />
      </SafeAreaProvider>,
      { state: mockInitialState },
    );

    const learnMoreButton = getByText(strings('stake.learn_more'));

    await act(async () => {
      fireEvent.press(learnMoreButton);
    });

    expect(Linking.openURL).toHaveBeenCalledWith(EARN_URLS.LENDING_FAQ);
  });
});
