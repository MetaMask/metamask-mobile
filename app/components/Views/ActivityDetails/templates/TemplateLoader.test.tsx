import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { TemplateLoader } from './TemplateLoader';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

// The amount header relies on the redesigned list's content resolver, which
// reads many selectors; stub it so these tests focus on template dispatch.
jest.mock(
  '../../../UI/ActivityListItemRow/useActivityListItemRowContent',
  () => ({
    useActivityListItemRowContent: () => ({
      avatarTokens: [],
      primaryAmount: '-1 ETH',
      secondaryAmount: undefined,
      primaryToken: { direction: 'out' },
      secondaryToken: undefined,
      title: 'Sent',
      subtitle: undefined,
    }),
  }),
);

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(() => ({})),
}));

jest.mock('../../../UI/ActivityListItemRow/useNftActivityImage', () => ({
  useNftActivityImage: () => undefined,
}));

jest.mock('../../../UI/Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: () => [],
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => {
    const actual = jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );
    return {
      ...actual,
      selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => ({
        address: '0x0000000000000000000000000000000000000001',
        metadata: { name: 'Account 1' },
      })),
    };
  },
);

jest.mock('../../../UI/Perps/hooks', () => ({
  usePerpsBlockExplorerUrl: () => ({
    getExplorerUrl: () => 'https://app.hyperliquid.xyz/explorer/address/0x1',
  }),
  usePerpsOrderFees: () => ({
    totalFee: 0,
    protocolFee: 0,
    metamaskFee: 0,
  }),
}));

const RAMP_DETAILS_STUB_TEST_ID = 'ramp-details-stub';
jest.mock('./RampDetails', () => {
  const actual = jest.requireActual('./RampDetails');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    RampDetails: () =>
      ReactActual.createElement(View, { testID: 'ramp-details-stub' }),
  };
});

const rampItem = (type: 'buy' | 'sell'): ActivityListItem =>
  ({
    type,
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xramp',
    raw: { type: 'rampOrder', data: {} },
    data: {
      token: { amount: '1', decimals: 18, symbol: 'ETH', direction: 'in' },
    },
  }) as unknown as ActivityListItem;

const sendItem: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: {
    from: '0xfrom',
    to: '0xto',
    token: {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      direction: 'out',
    },
  },
} as ActivityListItem;

const contractItem: ActivityListItem = {
  type: 'contractInteraction',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash2',
  data: { from: '0xfrom', to: '0xto' },
} as ActivityListItem;

const contractDeploymentItem: ActivityListItem = {
  type: 'contractDeployment',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash3',
  data: {},
} as ActivityListItem;

const swapItem: ActivityListItem = {
  type: 'swap',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xswap',
  data: {
    sourceToken: {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
      direction: 'out',
    },
    destinationToken: {
      amount: '1000000',
      decimals: 6,
      symbol: 'USDC',
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      direction: 'in',
    },
  },
} as ActivityListItem;

const bridgeItem: ActivityListItem = {
  ...swapItem,
  type: 'bridge',
  hash: '0xbridge',
  data: {
    ...swapItem.data,
    destinationToken: {
      amount: '1000000',
      decimals: 6,
      symbol: 'USDC',
      assetId: 'eip155:8453/erc20:0x0000000000000000000000000000000000000001',
      direction: 'in',
    },
  },
} as ActivityListItem;

const swapIncompleteItem: ActivityListItem = {
  type: 'swapIncomplete',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xswapincomplete',
  data: {
    sourceToken: {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'DAI',
      assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
      direction: 'out',
    },
  },
} as ActivityListItem;

const approvalItem: ActivityListItem = {
  type: 'approveSpendingCap',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xapprove',
  data: {
    token: {
      amount: '1000000',
      decimals: 6,
      symbol: 'USDC',
      direction: 'out',
    },
  },
} as ActivityListItem;

const nftItem: ActivityListItem = {
  type: 'nftMint',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xnft',
  data: {
    from: '0xfrom',
    to: '0xto',
    token: {
      symbol: 'NFT',
      direction: 'in',
    },
  },
} as ActivityListItem;

const nftBuyItem: ActivityListItem = {
  type: 'nftBuy',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xnftbuy',
  data: {
    from: '0xseller',
    to: '0xbuyer',
    token: {
      symbol: 'FLUF World: Scenes and Sounds',
      direction: 'in',
    },
    paymentToken: {
      amount: '89990000000000',
      decimals: 18,
      symbol: 'ETH',
      assetId: 'eip155:1/slip44:60',
      direction: 'out',
    },
  },
} as ActivityListItem;

const nftSellItem: ActivityListItem = {
  type: 'nftSell',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xnftsell',
  data: {
    from: '0xseller',
    to: '0xrecipient',
    token: {
      symbol: 'BAE',
      direction: 'out',
    },
    paymentToken: {
      amount: '1000000000000000',
      decimals: 18,
      symbol: 'ETH',
      assetId: 'eip155:1/slip44:60',
      direction: 'in',
    },
  },
} as ActivityListItem;

const claimMusdBonusItem: ActivityListItem = {
  type: 'claimMusdBonus',
  chainId: 'eip155:59144',
  status: 'success',
  timestamp: 1,
  hash: '0xclaim',
  data: {
    token: {
      amount: '2340000',
      decimals: 6,
      symbol: 'mUSD',
      direction: 'in',
    },
  },
} as ActivityListItem;

const depositItem: ActivityListItem = {
  type: 'deposit',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xdeposit',
  data: {
    token: {
      amount: '1000000',
      decimals: 6,
      symbol: 'USDC',
      direction: 'out',
    },
    fees: [
      { type: 'base', amount: '21000000000000', decimals: 18, symbol: 'ETH' },
    ],
  },
} as ActivityListItem;

const claimItem: ActivityListItem = {
  type: 'claim',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xclaimstake',
  data: {
    token: {
      amount: '500000',
      decimals: 6,
      symbol: 'USDC',
      direction: 'in',
    },
  },
} as ActivityListItem;

const unstakeItem: ActivityListItem = {
  type: 'unstake',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xunstake',
  data: {
    token: {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      direction: 'in',
    },
  },
} as ActivityListItem;

const smartAccountUpgradeItem: ActivityListItem = {
  type: 'smartAccountUpgrade',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xupgrade',
  data: {
    from: '0x0000000000000000000000000000000000000001',
    to: '0x0000000000000000000000000000000000000001',
    fees: [
      { type: 'base', amount: '21000000000000', decimals: 18, symbol: 'ETH' },
    ],
  },
} as ActivityListItem;

describe('TemplateLoader', () => {
  it('renders nothing when there is no item', () => {
    const { toJSON } = renderWithProvider(<TemplateLoader item={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the SendDetails template (with total row) for send/receive', () => {
    const { getByTestId } = renderWithProvider(
      <TemplateLoader item={sendItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW),
    ).toBeOnTheScreen();
  });

  it('falls back to DefaultDetails for unmapped types (no total row)', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={contractDeploymentItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });

  it('renders the PerpsDetails template for perps activity', () => {
    const perpsItem: ActivityListItem = {
      type: 'perpsAddFunds',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1,
      hash: '0xperps',
      raw: {
        type: 'perpsTransaction',
        data: {
          id: 'deposit-1',
          type: 'deposit',
          category: 'deposit',
          title: 'Account funded',
          subtitle: '+$100',
          timestamp: 1,
          asset: 'USDC',
          depositWithdrawal: {
            amount: '+$100',
            amountNumber: 100,
            isPositive: true,
            asset: 'USDC',
            txHash: '0xperps',
            status: 'completed',
            type: 'deposit',
          },
        },
      },
      data: {
        token: {
          amount: '100',
          symbol: 'USDC',
          direction: 'in',
        },
      },
    } as ActivityListItem;
    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={perpsItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.DO_IT_AGAIN_BUTTON),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });

  it.each([
    ['swap', swapItem],
    ['bridge', bridgeItem],
    ['approval', approvalItem],
    ['nft mint', nftItem],
    ['nft buy', nftBuyItem],
    ['nft sell', nftSellItem],
    ['contract interaction', contractItem],
    ['claim mUSD bonus', claimMusdBonusItem],
    ['earn/staking deposit', depositItem],
    ['earn/staking claim', claimItem],
    ['earn/staking unstake', unstakeItem],
  ])('renders the %s details template', (_type, item) => {
    const { getByTestId } = renderWithProvider(<TemplateLoader item={item} />);

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
  });

  it('routes a swapIncomplete tx to SwapDetails (source header + Swap again), not the generic fallback', () => {
    const { getByTestId } = renderWithProvider(
      <TemplateLoader item={swapIncompleteItem} />,
    );

    // The sent leg still renders even though the destination could not be resolved.
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    // "Swap again" is exclusive to SwapDetails, so its presence proves we did not
    // fall through to DefaultDetails for this type.
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.DO_IT_AGAIN_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders the DepositDetails template with a total row for deposits', () => {
    const { getByTestId } = renderWithProvider(
      <TemplateLoader item={depositItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW),
    ).toBeOnTheScreen();
  });

  it('routes a ramp buy to RampDetails', () => {
    const { getByTestId } = renderWithProvider(
      <TemplateLoader item={rampItem('buy')} />,
    );

    expect(getByTestId(RAMP_DETAILS_STUB_TEST_ID)).toBeOnTheScreen();
  });

  it('falls back to DefaultDetails for a non-ramp buy (no total row)', () => {
    const buyItem = {
      type: 'buy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1,
      hash: '0xbuy',
      data: {
        token: { amount: '1', decimals: 18, symbol: 'ETH', direction: 'in' },
      },
    } as ActivityListItem;

    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={buyItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });

  it('renders the SmartAccountUpgradeDetails template (fee, no total) for upgrades', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={smartAccountUpgradeItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(getByTestId(ActivityDetailsSelectorsIDs.FEE_ROW)).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });

  it('does not render fee or total rows for lending withdrawals with missing amounts', () => {
    const lendingWithdrawalItem: ActivityListItem = {
      type: 'lendingWithdrawal',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1,
      hash: '0xlendingwithdrawal',
      data: {
        destinationToken: {
          decimals: 6,
          symbol: 'USDC',
          direction: 'in',
        },
        fees: [
          {
            type: 'base',
            amount: '0',
            decimals: 18,
            symbol: 'ETH',
          },
        ],
      },
    } as ActivityListItem;

    const { queryByTestId } = renderWithProvider(
      <TemplateLoader item={lendingWithdrawalItem} />,
    );

    expect(queryByTestId(ActivityDetailsSelectorsIDs.FEE_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });
});
