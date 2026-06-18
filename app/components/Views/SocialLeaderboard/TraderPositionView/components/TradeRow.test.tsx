import { screen } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'expo-image';
import { AvatarAccount } from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TradeRow from './TradeRow';

const baseTrade: Trade = {
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 1,
  usdCost: 23155.92,
  timestamp: 1_700_000_000_000,
  transactionHash: '0xabc',
};

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const TRADER_ADDRESS = '0x0000000000000000000000000000000000000001';

describe('TradeRow', () => {
  it('renders the bought label for an enter trade', () => {
    renderWithProvider(
      <TradeRow trade={baseTrade} traderName="nodestack.eth" />,
    );

    expect(screen.getByText('nodestack.eth bought')).toBeOnTheScreen();
  });

  it('renders the sold label for an exit trade', () => {
    renderWithProvider(
      <TradeRow
        trade={{ ...baseTrade, intent: 'exit' }}
        traderName="nodestack.eth"
      />,
    );

    expect(screen.getByText('nodestack.eth sold')).toBeOnTheScreen();
  });

  it('renders the avatar image when a real image url is provided', () => {
    renderWithProvider(
      <TradeRow
        trade={baseTrade}
        traderName="nodestack.eth"
        traderImageUrl={REAL_AVATAR_URL}
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('renders the Maskicon fallback when the image url is absent', () => {
    renderWithProvider(
      <TradeRow
        trade={baseTrade}
        traderName="nodestack.eth"
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });
});
