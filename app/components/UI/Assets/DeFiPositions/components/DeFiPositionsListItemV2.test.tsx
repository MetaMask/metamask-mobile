import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiPositionsListItemV2 from './DeFiPositionsListItemV2';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder: MockAnalyticsEventBuilder } =
    jest.requireActual('../../../../../util/analytics/AnalyticsEventBuilder');
  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: MockAnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockPosition: DeFiProtocolPositionGroup = {
  protocolId: 'Aave V3',
  productName: 'Aave V3',
  protocolIconUrl: 'https://example.com/aave.png',
  chainId: 'eip155:1',
  marketValue: 1234.5,
  iconGroup: [
    { symbol: 'USDC', avatarValue: 'https://example.com/usdc.png' },
    { symbol: 'DAI', avatarValue: 'https://example.com/dai.png' },
  ],
  sections: [
    {
      productName: 'Aave V3 Market',
      positions: [
        {
          assetId: 'eip155:1/erc20:0x1111111111111111111111111111111111111111',
          chainId: 'eip155:1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          balance: '1000',
          marketValue: 1000,
          positionType: 'deposit',
          poolAddress: '0xpool',
          groupId: 'g1',
          tokenImage: 'https://example.com/usdc.png',
        },
      ],
    },
  ],
};

describe('DeFiPositionsListItemV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the protocol title, token summary, and aggregated value', async () => {
    const { findByText } = renderWithProvider(
      <DeFiPositionsListItemV2 position={mockPosition} privacyMode={false} />,
      { state: mockInitialState },
    );

    expect(await findByText('Aave V3')).toBeOnTheScreen();
    // Two icon-group entries render the "two_tokens" string.
    expect(await findByText('USDC +1 other')).toBeOnTheScreen();
    expect(await findByText('$1,234.50')).toBeOnTheScreen();
  });

  it('hides the market value in privacy mode', async () => {
    const { findByText, queryByText } = renderWithProvider(
      <DeFiPositionsListItemV2 position={mockPosition} privacyMode />,
      { state: mockInitialState },
    );

    expect(await findByText('Aave V3')).toBeOnTheScreen();
    expect(queryByText('$1,234.50')).not.toBeOnTheScreen();
  });

  it('navigates to the details screen and tracks the event on press', async () => {
    const { getByText } = renderWithProvider(
      <DeFiPositionsListItemV2 position={mockPosition} privacyMode={false} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Aave V3'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('DeFiProtocolPositionDetails', {
      protocolPositionGroup: mockPosition,
      networkIconAvatar: expect.anything(),
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.DEFI_PROTOCOL_DETAILS_OPENED,
      )
        .addProperties({
          chain_id: mockPosition.chainId,
          protocol_id: mockPosition.protocolId,
        })
        .build(),
    );
  });
});
