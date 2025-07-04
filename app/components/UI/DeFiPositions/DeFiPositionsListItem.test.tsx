import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DeFiPositionsListItem from './DeFiPositionsListItem';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useMetrics', () => {
  const actualUseMetrics = jest.requireActual('../../hooks/useMetrics');
  return {
    ...actualUseMetrics,
    useMetrics: () => ({
      ...actualUseMetrics.useMetrics(),
      trackEvent: mockTrackEvent,
    }),
  };
});

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockProtocolAggregateData: GroupedDeFiPositions['protocols'][number] = {
  protocolDetails: {
    name: 'Staked ETH Protocol',
    iconUrl: 'https://example.com/steth.png',
  },
  positionTypes: {
    stake: {
      aggregatedMarketValue: 21000,
      positions: [
        [
          {
            address: '0x1',
            name: 'Staked ETH',
            symbol: 'stETH',
            decimals: 18,
            balance: 10.5,
            balanceRaw: '10.5',
            marketValue: 21000.0,
            type: 'protocol',
            tokens: [
              {
                address: '0x0',
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
                balance: 10.5,
                balanceRaw: '10.5',
                marketValue: 21000.0,
                price: 2000,
                type: 'underlying',
                iconUrl: 'https://example.com/eth.png',
              },
            ],
          },
        ],
      ],
    },
    reward: {
      aggregatedMarketValue: 30100,
      positions: [
        [
          {
            address: '0x2',
            name: 'Reward Token',
            symbol: 'RWD',
            balance: 15,
            balanceRaw: '15',
            marketValue: 30000,
            decimals: 18,
            type: 'protocol',
            tokens: [
              {
                address: '0x0',
                name: 'ETH',
                symbol: 'ETH',
                iconUrl: 'https://example.com/eth.png',
                balance: 15,
                balanceRaw: '15',
                marketValue: 30000,
                price: 2000,
                decimals: 18,
                type: 'underlying',
              },
              {
                address: '0x3',
                name: 'USDC',
                symbol: 'USDC',
                iconUrl: 'https://example.com/usdc.png',
                balance: 100,
                balanceRaw: '100',
                marketValue: 100,
                price: 1,
                decimals: 18,
                type: 'underlying',
              },
            ],
          },
        ],
      ],
    },
  },
  aggregatedMarketValue: 51100,
};

const chainId: Hex = '0x1';
const protocolId = 'protocolId1';

describe('DeFiPositionsListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders protocol name and aggregated value', async () => {
    const { findByText, findAllByTestId } = renderWithProvider(
      <DeFiPositionsListItem
        chainId={chainId}
        protocolId={protocolId}
        protocolAggregate={mockProtocolAggregateData}
        privacyMode={false}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('Staked ETH Protocol')).toBeOnTheScreen();
    expect(await findByText('$51,100.00')).toBeOnTheScreen();
    expect(await findAllByTestId('token-avatar-image')).toHaveLength(3);
    expect(await findAllByTestId('network-avatar-image')).toHaveLength(1);
    expect(await findByText('ETH +1 other')).toBeOnTheScreen();
  });

  it('renders the component without balances in privacy mode', async () => {
    const { findByText, queryByText } = renderWithProvider(
      <DeFiPositionsListItem
        chainId={chainId}
        protocolId={protocolId}
        protocolAggregate={mockProtocolAggregateData}
        privacyMode
      />,
      { state: mockInitialState },
    );

    expect(await findByText('Staked ETH Protocol')).toBeOnTheScreen();
    expect(queryByText(/^\$\d+\.\d{2}$/)).not.toBeOnTheScreen(); // Matches dollar amounts like "$51,100.00"
    expect(await findByText('•••••••••')).toBeOnTheScreen();
    expect(await findByText('ETH +1 other')).toBeOnTheScreen();
  });

  it('navigates to DeFiProtocolPositionDetails on press', async () => {
    const { getByText } = renderWithProvider(
      <DeFiPositionsListItem
        chainId={chainId}
        protocolId={protocolId}
        protocolAggregate={mockProtocolAggregateData}
        privacyMode={false}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Staked ETH Protocol'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('DeFiProtocolPositionDetails', {
      protocolAggregate: mockProtocolAggregateData,
      networkIconAvatar: expect.anything(),
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.DEFI_PROTOCOL_DETAILS_OPENED,
      )
        .addProperties({
          chain_id: chainId,
          protocol_id: protocolId,
        })
        .build(),
    );
  });
});
