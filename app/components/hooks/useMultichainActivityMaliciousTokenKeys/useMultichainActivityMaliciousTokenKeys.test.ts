import type { Transaction } from '@metamask/keyring-api';
import { TokenScanResultType } from '@metamask/phishing-controller';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import type { MultichainTokenScanKey } from '../../../util/multichain/multichainTransactionTokenScan';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as multichainTransactionTokenScan from '../../../util/multichain/multichainTransactionTokenScan';
import { useMultichainActivityMaliciousTokenKeys } from './useMultichainActivityMaliciousTokenKeys';

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PhishingController: {
        bulkScanTokens: jest.fn().mockResolvedValue({}),
      },
    },
  },
}));

const SOL_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SPL_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const CAIP_TOKEN = `${SOL_MAINNET}/token:${SPL_MINT}`;

function makeReceiveTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    type: 'receive',
    id: 'tx-1',
    chain: SOL_MAINNET as `${string}:${string}`,
    status: 'confirmed',
    account: 'acc-1',
    timestamp: 1,
    from: [
      {
        address: 'Sender1111111111111111111111111111111111',
        asset: {
          fungible: true,
          type: `${SOL_MAINNET}/slip44:501`,
          unit: 'SOL',
          amount: '0.001',
        },
      },
    ],
    to: [
      {
        address: 'Recv111111111111111111111111111111111111',
        asset: {
          fungible: true,
          type: CAIP_TOKEN,
          unit: 'USDT',
          amount: '5000',
        },
      },
    ],
    events: [{ status: 'confirmed', timestamp: 1 }],
    fees: [
      {
        type: 'base',
        asset: {
          fungible: true,
          type: `${SOL_MAINNET}/slip44:501`,
          unit: 'SOL',
          amount: '0.00001',
        },
      },
    ],
    ...overrides,
  } as Transaction;
}

function getBulkScanTokensMock(): jest.Mock {
  return Engine.context.PhishingController.bulkScanTokens as jest.Mock;
}

describe('useMultichainActivityMaliciousTokenKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const bulkScanTokens = jest.fn().mockResolvedValue({});
    (
      Engine.context.PhishingController as unknown as {
        bulkScanTokens: jest.Mock;
      }
    ).bulkScanTokens = bulkScanTokens;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes with empty malicious keys and not scanning', () => {
    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([]),
    );

    expect(result.current.maliciousTokenKeys.size).toBe(0);
    expect(result.current.isScanning).toBe(false);
  });

  it('does not scan when bulkScanTokens is unavailable', async () => {
    (
      Engine.context.PhishingController as unknown as {
        bulkScanTokens: undefined;
      }
    ).bulkScanTokens = undefined;

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(result.current.maliciousTokenKeys.size).toBe(0);
  });

  it('does not scan when the activity fingerprint has no token keys', async () => {
    const onlyNative = makeReceiveTx({
      to: [
        {
          address: 'Recv111111111111111111111111111111111111',
          asset: {
            fungible: true,
            type: `${SOL_MAINNET}/slip44:501`,
            unit: 'SOL',
            amount: '1',
          },
        },
      ],
    });

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([onlyNative]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(getBulkScanTokensMock()).not.toHaveBeenCalled();
  });

  it('adds keys flagged Malicious by bulkScanTokens', async () => {
    getBulkScanTokensMock().mockResolvedValue({
      [SPL_MINT]: { result_type: TokenScanResultType.Malicious },
    });

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.maliciousTokenKeys.has(`solana:${SPL_MINT}`)).toBe(
        true,
      );
    });

    expect(getBulkScanTokensMock()).toHaveBeenCalledWith({
      chainId: 'solana',
      tokens: [SPL_MINT],
    });
  });

  it('replaces malicious keys when activity shifts to a different flagged token', async () => {
    const OTHER_MINT = 'CleanMint1111111111111111111111111111';
    const txFirst = makeReceiveTx({ id: 'first' });
    const txSecond = makeReceiveTx({
      id: 'second',
      to: [
        {
          address: 'Recv111111111111111111111111111111111111',
          asset: {
            fungible: true,
            type: `${SOL_MAINNET}/token:${OTHER_MINT}`,
            unit: 'USDT',
            amount: '1',
          },
        },
      ],
    });

    getBulkScanTokensMock()
      .mockResolvedValueOnce({
        [SPL_MINT]: { result_type: TokenScanResultType.Malicious },
      })
      .mockResolvedValueOnce({
        [OTHER_MINT]: { result_type: TokenScanResultType.Malicious },
      });

    const { result, rerender } = renderHook(
      ({ txs }: { txs: Transaction[] }) =>
        useMultichainActivityMaliciousTokenKeys(txs),
      { initialProps: { txs: [txFirst] } },
    );

    await waitFor(() => {
      expect(result.current.maliciousTokenKeys.has(`solana:${SPL_MINT}`)).toBe(
        true,
      );
    });

    rerender({ txs: [txSecond] });

    await waitFor(() => {
      expect(
        result.current.maliciousTokenKeys.has(`solana:${OTHER_MINT}`),
      ).toBe(true);
    });

    expect(result.current.maliciousTokenKeys.has(`solana:${SPL_MINT}`)).toBe(
      false,
    );
  });

  it('ignores non-Malicious scan results', async () => {
    getBulkScanTokensMock().mockResolvedValue({
      [SPL_MINT]: { result_type: TokenScanResultType.Warning },
    });

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(result.current.maliciousTokenKeys.size).toBe(0);
  });

  it('sets isScanning while a batch is pending', async () => {
    let resolveBatch: (value: Record<string, unknown>) => void = () =>
      undefined;
    getBulkScanTokensMock().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBatch = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(true);
    });

    await act(async () => {
      resolveBatch({});
    });

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });
  });

  it('clears malicious keys when bulkScanTokens rejects', async () => {
    getBulkScanTokensMock().mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(result.current.maliciousTokenKeys.size).toBe(0);
  });

  it('requests bulkScanTokens in batches of 100 addresses per namespace', async () => {
    const addrs = Array.from(
      { length: 101 },
      (_, i) => `Mint${i.toString().padStart(39, '0')}`,
    );
    const keys101 = addrs.map(
      (addr) => `solana:${addr}` as MultichainTokenScanKey,
    );

    const collectSpy = jest
      .spyOn(
        multichainTransactionTokenScan,
        'collectMultichainTransactionTokenScanKeys',
      )
      .mockReturnValue(keys101);

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(getBulkScanTokensMock()).toHaveBeenCalledTimes(2);
    expect(getBulkScanTokensMock().mock.calls[0]?.[0]).toEqual({
      chainId: 'solana',
      tokens: addrs.slice(0, 100),
    });
    expect(getBulkScanTokensMock().mock.calls[1]?.[0]).toEqual({
      chainId: 'solana',
      tokens: addrs.slice(100, 101),
    });

    collectSpy.mockRestore();
  });

  it('skips malformed scan keys when batching namespaces', async () => {
    const collectSpy = jest
      .spyOn(
        multichainTransactionTokenScan,
        'collectMultichainTransactionTokenScanKeys',
      )
      .mockReturnValue([
        'not-a-valid-colon-pattern',
        'solonly:',
        ':onlyaddr',
        `solana:${SPL_MINT}`,
      ] as MultichainTokenScanKey[]);

    getBulkScanTokensMock().mockResolvedValue({
      [SPL_MINT]: { result_type: TokenScanResultType.Malicious },
    });

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.maliciousTokenKeys.has(`solana:${SPL_MINT}`)).toBe(
        true,
      );
    });

    expect(getBulkScanTokensMock()).toHaveBeenCalledWith({
      chainId: 'solana',
      tokens: [SPL_MINT],
    });

    collectSpy.mockRestore();
  });

  it('does not apply malicious results after unmount mid-scan', async () => {
    let resolveBatch: (value: Record<string, unknown>) => void = () =>
      undefined;
    getBulkScanTokensMock().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBatch = resolve;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(true);
    });

    unmount();

    await act(async () => {
      resolveBatch({
        [SPL_MINT]: { result_type: TokenScanResultType.Malicious },
      });
    });
  });

  it('uses nullish coalescing when bulkScanTokens returns undefined results', async () => {
    getBulkScanTokensMock().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(result.current.maliciousTokenKeys.size).toBe(0);
  });

  it('warns when Engine.context throws before the scan try block runs', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const engine = Engine as { context: object };
    const savedContext = engine.context;

    Object.defineProperty(engine, 'context', {
      configurable: true,
      get() {
        throw new Error('ctx');
      },
    });

    renderHook(() =>
      useMultichainActivityMaliciousTokenKeys([makeReceiveTx()]),
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        'Multichain activity token scan failed:',
        expect.any(Error),
      );
    });

    Object.defineProperty(engine, 'context', {
      configurable: true,
      writable: true,
      enumerable: true,
      value: savedContext,
    });

    warnSpy.mockRestore();
  });
});
