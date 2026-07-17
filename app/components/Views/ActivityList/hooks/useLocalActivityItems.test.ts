import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useLocalActivityItems } from './useLocalActivityItems';
import {
  selectLocalTransactions,
  selectReplacedLocalTransactions,
} from '../../../../selectors/transactionController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectAllTokens } from '../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectLocalTransactions: jest.fn(),
  selectReplacedLocalTransactions: jest.fn(),
}));

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

const from = '0x9bed78535d6a03a955f1504aadba974d9a29e292';
const recipient = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';
const usdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

const makeTx = (overrides: Partial<TransactionMeta> = {}): TransactionMeta =>
  ({
    chainId: '0x2105',
    hash: '0xhash',
    id: 'tx-id',
    status: TransactionStatus.submitted,
    time: 1,
    type: TransactionType.simpleSend,
    txParams: {
      from,
      nonce: '0x1',
      to: recipient,
      value: '0x1',
    },
    ...overrides,
  }) as TransactionMeta;

const selectorState = {
  allTokens: {
    '0x2105': {
      [from.toLowerCase()]: [{ address: usdc, decimals: 6, symbol: 'USDC' }],
    },
  },
  bridgeHistory: {},
  groupAccount: { address: from },
  localTransactions: [] as unknown[],
  replacedTransactions: [] as unknown[],
  networks: {
    '0x2105': { nativeCurrency: 'ETH' },
  },
};

describe('useLocalActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectorState.localTransactions = [];
    selectorState.replacedTransactions = [];
    selectorState.bridgeHistory = {};
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectLocalTransactions:
          return selectorState.localTransactions;
        case selectReplacedLocalTransactions:
          return selectorState.replacedTransactions;
        case selectBridgeHistoryForAccount:
          return selectorState.bridgeHistory;
        case selectEvmNetworkConfigurationsByChainId:
          return selectorState.networks;
        case selectAllTokens:
          return selectorState.allTokens;
        case selectSelectedAccountGroupEvmInternalAccount:
          return selectorState.groupAccount;
        default:
          return undefined;
      }
    });
  });

  it('groups retried transactions by nonce and marks only the lowest nonce as earliest', () => {
    selectorState.localTransactions = [
      makeTx({
        id: 'nonce-1',
        hash: '0xnonce1',
        time: 1,
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      }),
      makeTx({
        id: 'nonce-2',
        hash: '0xnonce2',
        time: 2,
        txParams: { from, nonce: '0x2', to: recipient, value: '0x1' },
      }),
      makeTx({
        id: 'nonce-2-retry',
        hash: '0xnonce2retry',
        time: 3,
        type: TransactionType.retry,
        txParams: { from, nonce: '0x2', to: recipient, value: '0x2' },
      }),
      { id: 'smart-tx-without-params' },
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toMatchObject({
      hash: '0xnonce1',
      isEarliestNonce: true,
    });
    expect(result.current[1]).toMatchObject({
      hash: '0xnonce2retry',
      isEarliestNonce: false,
    });
  });

  it('does not mark a sole pending transaction as queued when lower nonces are confirmed', () => {
    selectorState.localTransactions = [
      makeTx({
        id: 'confirmed-nonce-1',
        hash: '0xconfirmednonce1',
        status: TransactionStatus.confirmed,
        time: 1,
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      }),
      makeTx({
        id: 'pending-nonce-2',
        hash: '0xpendingnonce2',
        status: TransactionStatus.submitted,
        time: 2,
        txParams: { from, nonce: '0x2', to: recipient, value: '0x1' },
      }),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(2);
    expect(
      result.current.find((item) => item.hash === '0xpendingnonce2'),
    ).toMatchObject({
      isEarliestNonce: true,
    });
  });

  it('marks a higher-nonce pending transaction as queued when a lower nonce is signed', () => {
    selectorState.localTransactions = [
      makeTx({
        id: 'signed-nonce-1',
        hash: '0xsignednonce1',
        status: TransactionStatus.signed,
        time: 1,
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      }),
      makeTx({
        id: 'pending-nonce-2',
        hash: '0xpendingnonce2',
        status: TransactionStatus.submitted,
        time: 2,
        txParams: { from, nonce: '0x2', to: recipient, value: '0x1' },
      }),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(2);
    expect(
      result.current.find((item) => item.hash === '0xpendingnonce2'),
    ).toMatchObject({
      isEarliestNonce: false,
    });
  });

  it('enriches contract-token metadata from the selected account token list', () => {
    selectorState.localTransactions = [
      makeTx({
        hash: '0xtoken',
        type: TransactionType.tokenMethodTransfer,
        txParams: {
          data: '0xa9059cbb00000000000000000000000080181d3ba89220cdb80234fc7aa19d5cc56229cc00000000000000000000000000000000000000000000000000000000000f4240',
          from,
          nonce: '0x1',
          to: usdc,
          value: '0x0',
        },
      }),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current[0]).toMatchObject({
      data: {
        token: {
          amount: '1000000',
          assetId:
            'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: 6,
          symbol: 'USDC',
        },
      },
    });
  });

  it('uses bridge history status and swap metadata enrichment', () => {
    selectorState.bridgeHistory = {
      bridgeTx: {
        status: { destChain: { txHash: '0xdestination' } },
      },
    };
    selectorState.localTransactions = [
      makeTx({
        actionId: 'bridgeTx',
        hash: '0xbridge',
        id: 'bridge-id',
        status: TransactionStatus.submitted,
        type: TransactionType.bridge,
      } as Partial<TransactionMeta>),
      makeTx({
        destinationTokenAddress: usdc,
        destinationTokenSymbol: 'USDC',
        hash: '0xswap',
        id: 'swap-id',
        sourceTokenSymbol: 'ETH',
        type: TransactionType.swap,
        txParams: { from, nonce: '0x2', to: usdc, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current[0]).toMatchObject({
      hash: '0xbridge',
      status: 'success',
    });
    expect(result.current[1]).toMatchObject({
      data: {
        destinationToken: { direction: 'in', symbol: 'USDC' },
        sourceToken: { direction: 'out', symbol: 'ETH' },
      },
    });
  });

  it('enriches a swap from the bridge quote when the TransactionMeta has no legacy swap fields', () => {
    // Unified swaps keep token metadata in the quote, not on the TransactionMeta,
    // so on-device fields are absent — the row would otherwise be swapIncomplete.
    selectorState.bridgeHistory = {
      'swap-id': {
        quote: {
          srcChainId: '0x89',
          destChainId: '0x89',
          srcAsset: {
            symbol: 'POL',
            decimals: 18,
            assetId: 'eip155:137/slip44:966',
          },
          destAsset: {
            symbol: 'USDT',
            decimals: 6,
            assetId:
              'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
          },
          srcTokenAmount: '1000000000000000000',
          destTokenAmount: '900000',
        },
      },
    };
    selectorState.localTransactions = [
      makeTx({
        hash: '0xnativeswap',
        id: 'swap-id',
        type: TransactionType.swap,
        txParams: { from, nonce: '0x3', to: usdc, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    // Resolves to a full swap (not swapIncomplete) with tokens + amounts from the quote.
    expect(result.current[0]).toMatchObject({
      type: 'swap',
      data: {
        sourceToken: {
          direction: 'out',
          symbol: 'POL',
          decimals: 18,
          amount: '1000000000000000000',
        },
        destinationToken: {
          direction: 'in',
          symbol: 'USDT',
          decimals: 6,
          amount: '900000',
        },
      },
    });
  });

  it('prefers the bridge quote over legacy TransactionMeta swap fields', () => {
    selectorState.bridgeHistory = {
      'swap-id': {
        quote: {
          srcChainId: '0x89',
          destChainId: '0x89',
          srcAsset: { symbol: 'POL', decimals: 18 },
          destAsset: { symbol: 'USDT', decimals: 6 },
          srcTokenAmount: '1000000000000000000',
          destTokenAmount: '900000',
        },
      },
    };
    selectorState.localTransactions = [
      makeTx({
        // Stale/partial legacy fields; the quote is authoritative.
        destinationTokenSymbol: 'STALE',
        sourceTokenSymbol: 'STALE',
        hash: '0xnativeswap',
        id: 'swap-id',
        type: TransactionType.swap,
        txParams: { from, nonce: '0x4', to: usdc, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current[0]).toMatchObject({
      data: {
        sourceToken: { symbol: 'POL', amount: '1000000000000000000' },
        destinationToken: { symbol: 'USDT', amount: '900000' },
      },
    });
  });

  it('merges a dropped speed-up original into its nonce group so it stays a send', () => {
    // The original send was dropped once the retry confirmed; only the retry is
    // in the (non-replaced) list. Without the merge, the retry would categorize
    // as a contractInteraction. With it, the original drives the type/amount and
    // the confirmed retry drives the status.
    selectorState.localTransactions = [
      makeTx({
        id: 'retry-1',
        hash: '0xretry',
        time: 2,
        status: TransactionStatus.confirmed,
        type: TransactionType.retry,
        originalType: TransactionType.simpleSend,
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];
    selectorState.replacedTransactions = [
      makeTx({
        id: 'orig-1',
        hash: '0xorig',
        time: 1,
        status: TransactionStatus.dropped,
        type: TransactionType.simpleSend,
        replacedBy: '0xretry',
        replacedById: 'retry-1',
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'send',
      status: 'success',
      hash: '0xretry',
    });
  });

  it('keeps the original amount and recipient when a send is cancelled', () => {
    // Cancel rewrites txParams to a zero-value self-send. The merged original
    // must supply the real amount/recipient (not 0 / self), with the cancel
    // driving the status.
    selectorState.localTransactions = [
      makeTx({
        id: 'cancel-1',
        hash: '0xcancel',
        time: 2,
        status: TransactionStatus.confirmed,
        type: TransactionType.cancel,
        originalType: TransactionType.simpleSend,
        txParams: { from, nonce: '0x1', to: from, value: '0x0' },
      } as Partial<TransactionMeta>),
    ];
    selectorState.replacedTransactions = [
      makeTx({
        id: 'orig-1',
        hash: '0xorig',
        time: 1,
        status: TransactionStatus.dropped,
        type: TransactionType.simpleSend,
        replacedBy: '0xcancel',
        replacedById: 'cancel-1',
        txParams: { from, nonce: '0x1', to: recipient, value: '0x5' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'send',
      status: 'cancelled',
      data: {
        to: recipient,
        token: { amount: '0x5' },
      },
    });
  });

  it('stays a successful send when the original confirms and the newer speed-up is dropped', () => {
    // Race outcome: the first-broadcast original won and confirmed; the (newer,
    // higher-gas) speed-up lost its nonce and was dropped. Status must reflect
    // the surviving original, not the newer dropped replacement.
    selectorState.localTransactions = [
      makeTx({
        id: 'orig-1',
        hash: '0xorig',
        time: 1,
        status: TransactionStatus.confirmed,
        type: TransactionType.simpleSend,
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      }),
    ];
    selectorState.replacedTransactions = [
      makeTx({
        id: 'retry-1',
        hash: '0xretry',
        time: 2, // newer than the confirmed winner
        status: TransactionStatus.dropped,
        type: TransactionType.retry,
        originalType: TransactionType.simpleSend,
        replacedBy: '0xorig',
        replacedById: 'orig-1',
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'send',
      status: 'success',
      hash: '0xorig',
    });
  });

  it('does not create a row for a replaced tx that has no surviving representative', () => {
    selectorState.localTransactions = [
      makeTx({
        id: 'send-1',
        hash: '0xsend',
        txParams: { from, nonce: '0x1', to: recipient, value: '0x1' },
      }),
    ];
    selectorState.replacedTransactions = [
      makeTx({
        id: 'orphan-replaced',
        hash: '0xorphan',
        time: 5,
        status: TransactionStatus.dropped,
        replacedBy: '0xgone',
        replacedById: 'gone',
        txParams: { from, nonce: '0x9', to: recipient, value: '0x1' },
      } as Partial<TransactionMeta>),
    ];

    const { result } = renderHook(() => useLocalActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ hash: '0xsend' });
  });
});
