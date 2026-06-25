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

// The amount header resolves NFT artwork via redux selectors; stub it so these
// tests stay focused on template dispatch.
jest.mock('../../../UI/ActivityListItemRow/useNftActivityImage', () => ({
  useNftActivityImage: () => undefined,
}));

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

  it('falls back to DefaultDetails for perps activity', () => {
    const perpsItem: ActivityListItem = {
      type: 'perpsAddFunds',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1,
      hash: '0xperps',
      data: {},
    } as ActivityListItem;
    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={perpsItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
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
  ])('renders the %s details template', (_type, item) => {
    const { getByTestId } = renderWithProvider(<TemplateLoader item={item} />);

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
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
