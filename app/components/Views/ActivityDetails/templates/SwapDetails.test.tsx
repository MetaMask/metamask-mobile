import React from 'react';
import { render } from '@testing-library/react-native';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { useTokensData } from '../../../hooks/useTokensData/useTokensData';
import { SwapDetails } from './SwapDetails';

// Capture the token the amount header receives so we can assert it was enriched
// with decimals before formatting.
let capturedSentToken: TokenAmount | undefined;

jest.mock('../../../hooks/useTokensData/useTokensData', () => ({
  useTokensData: jest.fn(() => ({})),
}));

jest.mock('../components', () => ({
  ActivityDetailsBlockExplorerButton: () => null,
  ActivityDetailsDoItAgainButton: () => null,
  ActivityDetailsFooter: () => null,
  ActivityDetailsMetadata: () => null,
  ActivityDetailsFeesAndTotal: () => null,
  ActivityDetailsDualAmountHeader: ({
    sentToken,
  }: {
    sentToken?: TokenAmount;
  }) => {
    capturedSentToken = sentToken;
    return null;
  },
}));

jest.mock('../hooks/useActivityDetailsDoItAgain', () => ({
  useActivityDetailsDoItAgain: () => jest.fn(),
  canRenderActivityDetailsDoItAgain: () => false,
}));

const USDT_ASSET_ID =
  'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

const makeLendingDepositItem = (
  sourceToken: Partial<TokenAmount>,
): ActivityListItem =>
  ({
    type: 'lendingDeposit',
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 1,
    hash: '0xabc',
    data: { sourceToken },
  }) as unknown as ActivityListItem;

describe('SwapDetails', () => {
  beforeEach(() => {
    capturedSentToken = undefined;
    jest.mocked(useTokensData).mockReturnValue({});
  });

  it('enriches the deposited token decimals from the tokens API so the amount is not rendered as raw base units', () => {
    // The adapter left `decimals` off the lending sourceToken; without
    // enrichment the amount header would format 10000 base units as "10,000"
    // instead of 0.01 USDT.
    jest.mocked(useTokensData).mockReturnValue({
      [USDT_ASSET_ID]: {
        assetId: USDT_ASSET_ID,
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
        iconUrl: '',
      },
    });

    render(
      <SwapDetails
        item={
          makeLendingDepositItem({
            direction: 'out',
            amount: '10000',
            assetId: USDT_ASSET_ID,
          }) as never
        }
      />,
    );

    expect(capturedSentToken?.decimals).toBe(6);
    expect(capturedSentToken?.symbol).toBe('USDT');
    expect(capturedSentToken?.amount).toBe('10000');
  });

  it('leaves an already-populated token unchanged (no-op when decimals are present)', () => {
    render(
      <SwapDetails
        item={
          makeLendingDepositItem({
            direction: 'out',
            amount: '10000',
            assetId: USDT_ASSET_ID,
            decimals: 6,
            symbol: 'USDT',
          }) as never
        }
      />,
    );

    expect(capturedSentToken?.decimals).toBe(6);
  });
});
