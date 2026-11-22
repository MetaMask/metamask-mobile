import React from 'react';
import { render } from '@testing-library/react-native';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  PERPS_CONSTANTS,
} from '@metamask/perps-controller';
import Engine from '../../../../../../core/Engine';
import WithdrawalFeesTooltipContent from './WithdrawalFeesTooltipContent';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getWithdrawalRoutes: jest.fn(),
      state: { isTestnet: false },
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => 'lighter'),
}));

jest.mock('../../../hooks/index', () => ({
  usePerpsConnection: () => ({ isInitialized: true }),
  usePerpsNetwork: () => 'mainnet',
}));

jest.mock('../../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(),
}));

const mockGetWithdrawalRoutes = Engine.context.PerpsController
  .getWithdrawalRoutes as jest.Mock;

describe('WithdrawalFeesTooltipContent', () => {
  it('shows the fee of the selected venue route', () => {
    mockGetWithdrawalRoutes.mockReturnValue([
      {
        assetId: HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet,
        chainId: 'eip155:42161',
        providerId: 'hyperliquid',
        constraints: { fees: { fixed: 1, token: 'USDC' } },
      },
      {
        assetId:
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/default',
        chainId: 'eip155:1',
        providerId: 'lighter',
        constraints: { fees: { fixed: 0.25, token: 'USDC' } },
      },
    ]);

    const { getAllByText, queryByText } = render(
      <WithdrawalFeesTooltipContent testID="withdrawal-fees" />,
    );

    expect(getAllByText('$0.25')).toHaveLength(2);
    expect(queryByText('$1.00')).toBeNull();
  });

  it('renders the placeholder when no route reports a fee', () => {
    mockGetWithdrawalRoutes.mockReturnValue([]);

    const { getAllByText, queryByText } = render(
      <WithdrawalFeesTooltipContent testID="withdrawal-fees" />,
    );

    expect(getAllByText(PERPS_CONSTANTS.FallbackPriceDisplay)).toHaveLength(2);
    expect(queryByText('$1.00')).toBeNull();
  });
});
