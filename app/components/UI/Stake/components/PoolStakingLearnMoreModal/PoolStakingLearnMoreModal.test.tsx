import React from 'react';
import PoolStakingLearnMoreModal from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/mockData';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { screen } from '@testing-library/react-native';
import { MOCK_VAULT_APRS, MOCK_VAULT_DAILY_APYS } from './mockVaultRewards';
import { fireLayoutEvent } from './InteractiveTimespanChart/InteractiveTimespanChart.testUtils';

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

jest.mock('../../hooks/useVaultAprs', () => ({
  __esModule: true,
  default: () => ({
    vaultAprs: MOCK_VAULT_APRS,
    isLoadingVaultAprs: false,
  }),
}));

jest.mock('../../hooks/useVaultApys', () => ({
  __esModule: true,
  default: () => ({
    vaultApys: MOCK_VAULT_DAILY_APYS,
    isLoadingVaultApys: false,
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('PoolStakingLearnMoreModal', () => {
  let renderResult: ReturnType<typeof renderWithProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    renderResult = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PoolStakingLearnMoreModal />
      </SafeAreaProvider>,
    );

    /**
     * react-native-svg-charts components listen for onLayout changes before they render any data.
     * You need to trigger these event handlers for each component in your tests.
     */
    fireLayoutEvent(screen.root, { width: 100, height: 100 });
  });

  afterEach(() => {
    // Clear render state
    renderResult = renderWithProvider(<></>);
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderResult;

    expect(toJSON()).toMatchSnapshot();
  });
});
