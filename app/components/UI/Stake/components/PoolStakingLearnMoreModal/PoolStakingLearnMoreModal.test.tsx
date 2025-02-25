import React, { ReactElement } from 'react';
import PoolStakingLearnMoreModal from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/mockData';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import {
  MOCK_POOLED_STAKING_VAULT_APY_AVERAGES,
  MOCK_POOLED_STAKING_VAULT_DAILY_APYS,
} from './mockVaultRewards';
import { AreaChart } from 'react-native-svg-charts';
import { fireLayoutEvent } from '../../../../../util/testUtils/react-native-svg-charts';
import { INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID } from './InteractiveTimespanChart';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

jest.mock('../../hooks/usePooledStakingVaultApyAverages', () => ({
  __esModule: true,
  default: () => ({
    vaultApyAverages: MOCK_POOLED_STAKING_VAULT_APY_AVERAGES,
    isLoadingVaultApyAverages: false,
    refreshPooledStakingVaultApyAverages: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePooledStakingVaultApys', () => ({
  __esModule: true,
  default: () => ({
    vaultApys: MOCK_POOLED_STAKING_VAULT_DAILY_APYS,
    isLoadingVaultApys: false,
    refreshPooledStakingVaultApys: jest.fn(),
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('PoolStakingLearnMoreModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', async () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PoolStakingLearnMoreModal />
      </SafeAreaProvider>,
    );

    const chartContainer = getByTestId(
      INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID,
    );
    const areaChart = chartContainer.find(
      (child: ReactElement) => child.type === AreaChart,
    );

    fireLayoutEvent(areaChart);

    expect(toJSON()).toMatchSnapshot();
  });
});
