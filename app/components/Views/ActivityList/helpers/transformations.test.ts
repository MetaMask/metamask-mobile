import type {
  V1TransactionByHashResponse,
  V5MultiAccountTransactionsResponse,
  V5TransactionRecord,
} from '@metamask/core-backend';
import {
  TransactionStatus as KeyringTransactionStatus,
  TransactionType as KeyringTransactionType,
} from '@metamask/keyring-api';
import type { InfiniteData } from '@tanstack/react-query';
import {
  isBridgeHistoryForEvmTransaction,
  mapNonEvmTransactions,
  mergeTransactionsByTime,
  selectApiEvmTransactions,
  shouldSkipUnrelatedTransaction,
} from './transformations';

const address = '0x0000000000000000000000000000000000000001';
const otherAddress = '0x0000000000000000000000000000000000000002';
// Real addresses from metamask-mobile#40391 (BNB Chain): the attacker whose
// transaction emitted the spoofed Transfer logs, and the scam token contract.
const attackerAddress = '0x3843c61d6f8fc8b925e37f76df4fd94812745700';
const scamContractAddress = '0xcd4be77fd669a90714df8ce7ce23a060690b4109';

const buildTransaction = (
  overrides: Partial<V1TransactionByHashResponse> = {},
): V1TransactionByHashResponse =>
  ({
    hash: '0xhash',
    timestamp: '2026-05-13T14:34:23.000Z',
    chainId: 59144,
    blockNumber: 100,
    blockHash: '0xblock',
    gas: 21000,
    gasUsed: 21000,
    gasPrice: '1000000000',
    effectiveGasPrice: '1000000000',
    nonce: 0,
    cumulativeGasUsed: 21000,
    value: '0',
    to: otherAddress,
    from: address,
    transactionCategory: 'TRANSFER',
    valueTransfers: [],
    ...overrides,
  }) as unknown as V1TransactionByHashResponse;

const buildV5Transaction = (
  overrides: {
    id?: string;
    from?: string;
    to?: string | null;
    value?: string;
    methodId?: string;
    valueTransfers?: V5TransactionRecord['valueTransfers'];
  } = {},
): V5TransactionRecord => ({
  accountId: `eip155:59144:${address}`,
  tx: {
    id: overrides.id ?? '0xhash',
    chainId: 'eip155:59144',
    status: 'confirmed',
    timestamp: 1778593067000,
    date: '2026-05-12T13:37:47.000Z',
    from: overrides.from ?? address,
    to: overrides.to ?? otherAddress,
    blockNumber: '1',
    blockHash: '0xblock',
    value: overrides.value ?? '0',
    methodId: overrides.methodId,
    transactionCategory: 'TRANSFER',
  },
  valueTransfers: overrides.valueTransfers ?? [],
  fee: null,
});

const buildV5Data = (
  transactions: V5TransactionRecord[],
): InfiniteData<V5MultiAccountTransactionsResponse> =>
  ({
    pages: [
      {
        data: transactions,
        pageInfo: {
          count: transactions.length,
          endCursor: 'next',
          hasNextPage: true,
        },
        unprocessedAccounts: [],
      } as V5MultiAccountTransactionsResponse,
    ],
    pageParams: [undefined],
  }) as InfiniteData<V5MultiAccountTransactionsResponse>;

describe('ActivityList transformations', () => {
  describe('shouldSkipUnrelatedTransaction', () => {
    it('keeps direct receives that the list gate drops via their value transfers', () => {
      const tokenReceive = buildTransaction({
        from: otherAddress,
        to: address,
        value: '0',
        valueTransfers: [
          {
            amount: '1000000',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 6,
            from: otherAddress,
            name: 'USD Coin',
            symbol: 'USDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      });

      expect(shouldSkipUnrelatedTransaction(address, tokenReceive)).toBe(false);
    });

    it('still skips excluded hashes, non-participant, and empty self transfers', () => {
      expect(
        shouldSkipUnrelatedTransaction(
          address,
          buildTransaction(),
          new Set(['0xhash']),
        ),
      ).toBe(true);
      expect(
        shouldSkipUnrelatedTransaction(
          address,
          buildTransaction({
            from: otherAddress,
            to: otherAddress,
            valueTransfers: [
              {
                amount: '1',
                contractAddress: '',
                decimal: 18,
                from: otherAddress,
                name: 'Ether',
                symbol: 'ETH',
                to: address,
                transferType: 'NATIVE',
              },
            ],
          }),
        ),
      ).toBe(true);
      expect(
        shouldSkipUnrelatedTransaction(
          address,
          buildTransaction({
            from: address,
            methodId: '0x',
            to: address,
            value: '0',
            valueTransfers: [],
          }),
        ),
      ).toBe(true);
      expect(shouldSkipUnrelatedTransaction(address, buildTransaction())).toBe(
        false,
      );
    });
  });

  it('matches bridge history by tx ids, original id, and source hash', () => {
    const bridgeHistoryValues = [
      {
        txMetaId: 'meta-id',
        originalTransactionId: 'original-id',
        status: { srcChain: { txHash: '0xBridgeHash' } },
      },
    ];

    expect(
      isBridgeHistoryForEvmTransaction(
        { id: 'meta-id' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { actionId: 'original-id' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { hash: '0xbridgehash' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { hash: '0xother' },
        bridgeHistoryValues as never,
      ),
    ).toBe(false);
  });

  it('selects API EVM transactions while preserving the infinite-query shape', () => {
    const tx = buildV5Transaction({ id: '0xkept', value: '1' });
    const skipped = buildV5Transaction({ id: '0xskipped', value: '1' });
    const select = selectApiEvmTransactions({
      address,
      excludedTxHashes: new Set(['0xskipped']),
    });

    const result = select(buildV5Data([tx, skipped]));

    expect(result.pages[0].pageInfo.endCursor).toBe('next');
    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0]).toMatchObject({
      chainId: 'eip155:59144',
      hash: '0xkept',
      type: 'send',
    });
  });

  it('maps non-EVM transactions and merges by descending timestamp', () => {
    const nonEvmItems = mapNonEvmTransactions([
      {
        id: 'solana-tx',
        chain: 'solana:mainnet',
        from: [
          {
            address: otherAddress,
            asset: {
              amount: '1',
              fungible: true,
              type: 'solana:mainnet/slip44:501',
              unit: 'SOL',
            },
          },
        ],
        status: KeyringTransactionStatus.Confirmed,
        timestamp: 1,
        to: [{ address }],
        type: KeyringTransactionType.Send,
      },
    ] as never);

    expect(nonEvmItems[0].hash).toBe('solana-tx');

    const merged = mergeTransactionsByTime(
      [
        {
          ...nonEvmItems[0],
          timestamp: 1,
        },
      ],
      [
        {
          type: 'receive',
          chainId: 'eip155:1',
          status: 'success',
          timestamp: 3,
          hash: '0xconfirmed',
          data: { from: otherAddress, to: address },
        },
      ],
      [
        {
          type: 'send',
          chainId: 'solana:mainnet',
          status: 'success',
          timestamp: 2,
          hash: '0xnon-evm',
          data: { from: otherAddress, to: address },
        },
      ],
    );

    expect(merged.map((item) => item.timestamp)).toEqual([3, 2, 1]);
  });

  it('maps a Tron stake to the staking kind rather than a contract interaction', () => {
    const nonEvmItems = mapNonEvmTransactions([
      {
        id: 'tron-stake',
        chain: 'tron:728126428',
        from: [
          {
            address,
            asset: {
              amount: '100',
              fungible: true,
              type: 'tron:728126428/slip44:195',
              unit: 'TRX',
            },
          },
        ],
        status: KeyringTransactionStatus.Confirmed,
        timestamp: 1,
        to: [],
        type: KeyringTransactionType.StakeDeposit,
      },
    ] as never);

    expect(nonEvmItems[0]).toMatchObject({
      type: 'stake',
      hash: 'tron-stake',
      data: { token: { symbol: 'TRX', amount: '100', direction: 'out' } },
    });
  });

  describe('selectApiEvmTransactions', () => {
    it('keeps rows where the subject only appears in value transfers', () => {
      const relayedTransfer = buildV5Transaction({
        id: '0xrelayed',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1',
            decimal: 18,
            symbol: 'aUSDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([relayedTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(1);
    });

    it('drops zero-value self-sends', () => {
      const selfSend = buildV5Transaction({ to: address, methodId: '0x' });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([selfSend]),
      );

      expect(result.pages[0].data).toEqual([]);
    });

    it('classifies pooled-staking calls instead of leaving them as contract interactions', () => {
      const pool = '0x4fef9d741011476750a243ac70b9789a63dd47df';
      const stakeDeposit = buildV5Transaction({
        id: '0xstake',
        to: pool,
        methodId: '0xf9609f08',
        value: '1000000000000000000',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: pool,
            assetId: 'eip155:1/slip44:60',
            amount: '1000000000000000000',
            decimal: 18,
            symbol: 'ETH',
          },
        ],
      });
      stakeDeposit.tx.chainId = 'eip155:1';
      stakeDeposit.accountId = `eip155:1:${address}`;
      stakeDeposit.fee = {
        payer: `eip155:1:${address}`,
        asset: { assetId: 'eip155:1/slip44:60', amount: '21000', decimals: 18 },
      };

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([stakeDeposit]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        chainId: 'eip155:1',
        hash: '0xstake',
        type: 'stake',
        data: {
          token: {
            amount: '1000000000000000000',
            assetId: 'eip155:1/slip44:60',
            direction: 'out',
            symbol: 'ETH',
          },
          fees: [expect.objectContaining({ amount: '21000' })],
        },
      });
    });

    it('keeps a real outgoing token transfer as a send', () => {
      const realSend = buildV5Transaction({
        id: '0xreal-send',
        from: address,
        to: '0x3333333333333333333333333333333333333333',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([realSend]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xreal-send',
        type: 'send',
        data: { from: address, to: otherAddress },
      });
    });

    it('keeps a real incoming token transfer as a receive', () => {
      const realReceive = buildV5Transaction({
        id: '0xreal-receive',
        from: otherAddress,
        to: '0x3333333333333333333333333333333333333333',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: otherAddress,
            to: address,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([realReceive]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xreal-receive',
        type: 'receive',
        data: { from: otherAddress, to: address },
      });
    });

    it('reclassifies a spoofed Transfer log as a contract interaction, not a send', () => {
      const spoof = buildV5Transaction({
        id: '0xspoof',
        from: attackerAddress,
        to: scamContractAddress,
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId: `eip155:56/erc20:${scamContractAddress}`,
            amount: '1240000',
            decimal: 6,
            symbol: 'U5DT',
          },
          {
            assetClass: 'ft',
            from: attackerAddress,
            to: otherAddress,
            assetId: `eip155:56/erc20:${scamContractAddress}`,
            amount: '5000000',
            decimal: 6,
            symbol: 'U5DT',
          },
        ],
      });
      spoof.tx.chainId = 'eip155:56';
      spoof.accountId = `eip155:56:${address}`;

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([spoof]),
      );

      expect(result.pages[0].data).toHaveLength(1);
      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xspoof',
        type: 'contractInteraction',
        data: {
          from: attackerAddress,
          to: scamContractAddress,
          token: expect.objectContaining({ symbol: 'U5DT' }),
        },
      });
    });

    it('keeps a user-signed send that goes through a contract as a send', () => {
      const routerSend = buildV5Transaction({
        id: '0xrouter-send',
        from: address,
        to: '0x4444444444444444444444444444444444444444',
        methodId: '0x38ed1739',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: '0x4444444444444444444444444444444444444444',
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([routerSend]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xrouter-send',
        type: 'send',
        data: { from: address },
      });
    });

    it('keeps a user-signed transaction whose log only names the user as recipient as a receive', () => {
      const incomingLeg = buildV5Transaction({
        id: '0xincoming-leg',
        from: address,
        to: '0x3333333333333333333333333333333333333333',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: otherAddress,
            to: address,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([incomingLeg]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xincoming-leg',
        type: 'receive',
      });
    });

    it('keeps a real send in a multi-log transaction as a send', () => {
      const multiLog = buildV5Transaction({
        id: '0xmulti-log',
        from: address,
        to: '0x3333333333333333333333333333333333333333',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
          {
            assetClass: 'ft',
            from: otherAddress,
            to: '0x0000000000000000000000000000000000000003',
            assetId:
              'eip155:59144/erc20:0x5555555555555555555555555555555555555555',
            amount: '42',
            decimal: 18,
            symbol: 'FOO',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([multiLog]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xmulti-log',
        type: 'send',
        data: { from: address, to: otherAddress },
      });
    });

    it('shows the same transfer as a receive for the other account', () => {
      // The rule keys on the selected account: A's send is B's receive, and
      // the reclassification only ever touches `send` rows.
      const otherAccountView = buildV5Transaction({
        id: '0xother-account-view',
        from: address,
        to: '0x3333333333333333333333333333333333333333',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1000000',
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address: otherAddress })(
        buildV5Data([otherAccountView]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xother-account-view',
        type: 'receive',
        data: { from: address, to: otherAddress },
      });
    });

    it('keeps the spoofed row as a send when viewed as the signer', () => {
      // The rule keys on the selected account: for the attacker, who did
      // sign the transaction, the row is their send.
      const signerView = buildV5Transaction({
        id: '0xsigner-view',
        from: attackerAddress,
        to: scamContractAddress,
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId: `eip155:56/erc20:${scamContractAddress}`,
            amount: '1240000',
            decimal: 6,
            symbol: 'U5DT',
          },
        ],
      });
      signerView.tx.chainId = 'eip155:56';
      signerView.accountId = `eip155:56:${attackerAddress}`;

      const result = selectApiEvmTransactions({ address: attackerAddress })(
        buildV5Data([signerView]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xsigner-view',
        type: 'send',
      });
    });

    it('already renders a spoofed log on a contract call as a contract interaction', () => {
      const contractCallSpoof = buildV5Transaction({
        id: '0xcontract-call-spoof',
        from: attackerAddress,
        to: scamContractAddress,
        methodId: '0x12345678',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId: `eip155:56/erc20:${scamContractAddress}`,
            amount: '1240000',
            decimal: 6,
            symbol: 'U5DT',
          },
        ],
      });
      contractCallSpoof.tx.chainId = 'eip155:56';
      contractCallSpoof.accountId = `eip155:56:${address}`;
      contractCallSpoof.tx.transactionCategory = 'CONTRACT_CALL';

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([contractCallSpoof]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xcontract-call-spoof',
        type: 'contractInteraction',
      });
    });

    it('keeps a relayed transfer row, reclassified as a contract interaction without a local copy', () => {
      // The row must stay visible. A relayed send submitted through this
      // wallet has a local `send` row for the same hash, and the list and
      // details views prefer the local row over the API copy, so it still
      // renders as a send there. Without a local copy only the API row
      // exists, and it renders as an interaction rather than asserting a
      // send the wallet did not submit.
      const relayedTransfer = buildV5Transaction({
        id: '0xrelayed-reclassified',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1',
            decimal: 18,
            symbol: 'aUSDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([relayedTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(1);
      expect(result.pages[0].data[0]).toMatchObject({
        hash: '0xrelayed-reclassified',
        type: 'contractInteraction',
      });
    });
  });
});
