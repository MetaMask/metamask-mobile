import React from 'react';
import { render } from '@testing-library/react-native';
import { QuickBuy } from '../../../QuickBuy/quickBuy';
import {
  COLLECTOR_CRYPT_SCOPE,
  SOLANA_USDC_MINT,
} from '../../providers/collector-crypt/constants';
import FundingSheet from './FundingSheet';

jest.mock('../../../QuickBuy/quickBuy', () => ({
  QuickBuy: { Root: jest.fn(() => null) },
}));

const mockRoot = jest.mocked(QuickBuy.Root);

describe('FundingSheet', () => {
  beforeEach(() => {
    mockRoot.mockClear();
  });

  it('opens a buy-only Quick Buy for Solana USDC with the funding options', () => {
    const onClose = jest.fn();
    const onTradeStateChange = jest.fn();

    render(
      <FundingSheet
        options={{
          destinationAddress: 'SolanaAddress',
          initialAmountUsd: 30,
          onTradeStateChange,
        }}
        onClose={onClose}
      />,
    );

    const props = mockRoot.mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        isVisible: true,
        target: expect.objectContaining({
          chain: COLLECTOR_CRYPT_SCOPE,
          tokenAddress: SOLANA_USDC_MINT,
        }),
        features: expect.objectContaining({ tradeModes: ['buy'] }),
        destinationAddress: 'SolanaAddress',
        initialAmountUsd: 30,
        onTradeStateChange,
        onClose,
      }),
    );
  });

  it('attributes funding trades to the Gacha source', () => {
    render(<FundingSheet options={{}} onClose={jest.fn()} />);

    expect(mockRoot.mock.calls[0][0].analyticsContext).toEqual({
      source: 'gacha',
    });
  });
});
