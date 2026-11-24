import { renderHook, waitFor } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { LIGHTER_BRIDGE_CONFIG } from '@metamask/perps-controller/constants/lighterConfig';

import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../../util/transaction-controller';
import { generateTransferData } from '../../../../../util/transactions';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  useSyncPerpsLighterTransactionType,
  useLighterAccountLookupState,
} from './useSyncPerpsLighterTransactionType';

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: { subscribe: jest.fn(), unsubscribe: jest.fn() },
  context: {
    ApprovalController: {
      rejectRequest: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionPayController: {
      state: { transactionData: {} },
      setTransactionConfig: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
  addTransactionBatch: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('./useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockAddTransaction = jest.mocked(addTransaction);
const mockRejectRequest = jest.mocked(
  Engine.context.ApprovalController.rejectRequest,
);
const mockFindNetworkClientId = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);

const USER = '0x1111111111111111111111111111111111111111';
const HYPERLIQUID_BRIDGE = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';
const ARBITRUM_USDC = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const { bridgeContract, usdcContract } = LIGHTER_BRIDGE_CONFIG.mainnet;

const transferData = (amount: number) =>
  generateTransferData('transfer', {
    toAddress: HYPERLIQUID_BRIDGE,
    amount: amount.toString(16),
  });

const hyperliquidDeposit = {
  id: 'tx-1',
  chainId: '0xa4b1',
  networkClientId: 'arbitrum',
  origin: 'metamask',
  txParams: {
    from: USER,
    to: ARBITRUM_USDC,
    data: transferData(2_000_000),
    value: '0x0',
    gas: '0x30d40',
  },
  type: TransactionType.perpsDeposit,
  nestedTransactions: [
    { data: transferData(2_000_000), to: ARBITRUM_USDC, value: '0x0' },
  ],
  requiredAssets: [{ address: ARBITRUM_USDC, amount: '0x1e8480' }],
};

interface Selection {
  destination: 'hyperliquid' | 'lighter';
  source: 'hyperliquid' | 'lighter';
}

function setEnteredAmount(transactionId: string, amountRaw: string): void {
  Engine.context.TransactionPayController.state.transactionData = {
    [transactionId]: {
      isLoading: false,
      tokens: [{ amountHuman: '0', amountRaw }],
    },
  } as never;
}

function renderSync(initialProps: Selection) {
  return renderHook<void, Selection>(
    (props) => useSyncPerpsLighterTransactionType(props),
    { initialProps },
  );
}

const noAccount = () =>
  jest.fn().mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ code: 21100, message: 'account not found' }),
  });

describe('useSyncPerpsLighterTransactionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindNetworkClientId.mockReturnValue('mainnet');
    mockAddTransaction.mockResolvedValue({} as never);
    setEnteredAmount('tx-1', '2000000');
    global.fetch = noAccount();
  });

  it('creates a mainnet Lighter deposit and rejects the Hyperliquid one when the address has no Lighter account', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith('tx-1', expect.anything());
    });

    const [params, options] = mockAddTransaction.mock.calls[0];
    expect(mockAddTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      mockRejectRequest.mock.invocationCallOrder[0],
    );
    expect(params.from).toBe(USER);
    expect(params.to).toBe(USER);
    expect(options).toStrictEqual(
      expect.objectContaining({
        isInternal: true,
        networkClientId: 'mainnet',
        origin: 'metamask',
        requireApproval: true,
        type: TransactionType.perpsLighterDeposit,
      }),
    );
    expect(options.nestedTransactions).toHaveLength(2);
    expect(options.nestedTransactions?.[0].to).toBe(usdcContract);
    expect(options.nestedTransactions?.[1].to).toBe(bridgeContract);
    expect(options.nestedTransactions?.[1].data?.startsWith('0x8a857083')).toBe(
      true,
    );
    expect(options.requiredAssets?.[0]).toStrictEqual(
      expect.objectContaining({
        address: usdcContract,
        amount: '0x1e8480',
        standard: 'erc20',
      }),
    );
  });

  it('creates a Lighter deposit without calldata and sets the payment override when the address already has a Lighter account', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [{}] }),
    });
    mockAddTransaction.mockResolvedValue({
      transactionMeta: { id: 'tx-2' },
    } as never);
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith('tx-1', expect.anything());
    });

    const [params, options] = mockAddTransaction.mock.calls[0];
    expect(params).toStrictEqual({ from: USER, to: USER, value: '0x0' });
    expect(options.nestedTransactions).toBeUndefined();
    expect(options).toStrictEqual(
      expect.objectContaining({
        networkClientId: 'mainnet',
        requireApproval: true,
        type: TransactionType.perpsLighterDeposit,
      }),
    );
    expect(options.requiredAssets?.[0]).toStrictEqual(
      expect.objectContaining({
        address: usdcContract,
        amount: '0x1e8480',
        standard: 'erc20',
      }),
    );

    const setTransactionConfig = jest.mocked(
      Engine.context.TransactionPayController.setTransactionConfig,
    );
    expect(setTransactionConfig).toHaveBeenCalledWith(
      'tx-2',
      expect.any(Function),
    );
    const config: Record<string, unknown> = {};
    setTransactionConfig.mock.calls[0][1](config);
    expect(config).toStrictEqual({
      isQuoteRequired: true,
      paymentOverride: 'perpsLighter',
    });
    expect(mockAddTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      mockRejectRequest.mock.invocationCallOrder[0],
    );
  });

  it('logs whether the address has a Lighter account', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
        address: USER,
        exists: false,
      });
    });
  });

  it('recreates the Hyperliquid deposit with the amount committed on Lighter', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledTimes(1);
    });

    setEnteredAmount('tx-2', '80000000');
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      id: 'tx-2',
      chainId: '0x1',
      networkClientId: 'mainnet',
      type: TransactionType.perpsLighterDeposit,
    } as never);

    rerender({ destination: 'hyperliquid', source: 'hyperliquid' });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith('tx-2', expect.anything());
    });

    const [params, options] = mockAddTransaction.mock.calls[1];
    const decoded = parseStandardTokenTransactionData(params.data);
    expect(options.type).toBe(TransactionType.perpsDeposit);
    expect(options.networkClientId).toBe('arbitrum');
    expect(options.origin).toBe('metamask');
    expect(params.to).toBe(ARBITRUM_USDC);
    expect(params.gas).toBe('0x30d40');
    expect(decoded?.args?._to.toLowerCase()).toBe(HYPERLIQUID_BRIDGE);
    expect(decoded?.args?._value.toString()).toBe('80000000');
    expect(options.nestedTransactions?.[0].data).toBe(params.data);
    expect(options.requiredAssets).toStrictEqual([
      { address: ARBITRUM_USDC, amount: '0x4c4b400' },
    ]);
  });

  it('logs when there is no Hyperliquid confirmation to restore', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsLighterDeposit,
    } as never);

    renderSync({ destination: 'hyperliquid', source: 'hyperliquid' });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No Hyperliquid confirmation to restore',
        }),
        'Failed to recreate the Perps transaction',
      );
    });
    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(mockRejectRequest).not.toHaveBeenCalled();
  });

  it('leaves the confirmation unchanged when it already has the selected type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'hyperliquid', source: 'hyperliquid' });

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves the confirmation unchanged when no transaction is open', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not look the account up again for the same address', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    const props: Selection = {
      destination: 'hyperliquid',
      source: 'lighter',
    };
    const { rerender } = renderSync(props);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );
    rerender(props);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('logs a lookup failure for a Lighter withdraw', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    renderSync({ destination: 'hyperliquid', source: 'lighter' });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'network down' }),
        'Failed to look up the Lighter account',
      );
    });
  });

  it('recreates a withdraw as a Lighter withdraw on the same chain and calls', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    renderSync({ destination: 'hyperliquid', source: 'lighter' });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith('tx-1', expect.anything());
    });

    const [params, options] = mockAddTransaction.mock.calls[0];
    expect(params).toStrictEqual(hyperliquidDeposit.txParams);
    expect(options).toStrictEqual({
      nestedTransactions: hyperliquidDeposit.nestedTransactions,
      networkClientId: 'arbitrum',
      origin: 'metamask',
      requireApproval: true,
      type: TransactionType.perpsLighterWithdraw,
    });
  });

  it('recreates a withdraw batch as a Lighter withdraw batch', async () => {
    // Like the real controller, the batch promise stays pending until approval.
    jest.mocked(addTransactionBatch).mockImplementation(async () => {
      const [, handler] = jest.mocked(Engine.controllerMessenger.subscribe).mock
        .calls[0] as unknown as [string, (meta: TransactionMeta) => void];
      handler({ id: 'tx-2', type: TransactionType.batch } as TransactionMeta);
      return await new Promise(() => undefined);
    });
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.batch,
      nestedTransactions: [
        {
          data: transferData(0),
          to: ARBITRUM_USDC,
          value: '0x0',
          type: TransactionType.perpsWithdraw,
        },
      ],
    } as never);

    renderSync({ destination: 'hyperliquid', source: 'lighter' });

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledWith('tx-1', expect.anything());
    });

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(
      jest.mocked(addTransactionBatch).mock.calls[0][0].transactions,
    ).toStrictEqual([
      {
        params: { to: ARBITRUM_USDC, data: transferData(0), value: '0x0' },
        type: TransactionType.perpsLighterWithdraw,
      },
    ]);
  });

  it('leaves a Lighter withdraw batch unchanged while Lighter is selected', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.batch,
      nestedTransactions: [
        { to: ARBITRUM_USDC, type: TransactionType.perpsLighterWithdraw },
      ],
    } as never);

    renderSync({ destination: 'hyperliquid', source: 'lighter' });

    expect(addTransactionBatch).not.toHaveBeenCalled();
    expect(mockRejectRequest).not.toHaveBeenCalled();
  });

  it('creates the deposit after the address was not an address', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      txParams: { ...hyperliquidDeposit.txParams, from: 'not-an-address' },
    } as never);

    const props: Selection = {
      destination: 'lighter',
      source: 'hyperliquid',
    };
    const { rerender } = renderSync(props);

    expect(mockAddTransaction).not.toHaveBeenCalled();

    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );
    rerender(props);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });
  });

  it('logs when no Ethereum mainnet client is available', async () => {
    mockFindNetworkClientId.mockReturnValue('');
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'No Ethereum mainnet network client for the Lighter USDC deposit',
        }),
        'Failed to recreate the Perps transaction',
      );
    });
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('logs when the account lookup rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({ destination: 'lighter', source: 'hyperliquid' });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'network down' }),
        'Failed to look up the Lighter account',
      );
    });
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('logs and allows a retry when adding the transaction fails', async () => {
    mockAddTransaction.mockRejectedValueOnce(new Error('add failed'));
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const props: Selection = {
      destination: 'lighter',
      source: 'hyperliquid',
    };
    const { rerender } = renderSync(props);

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'add failed' }),
        'Failed to recreate the Perps transaction',
      );
    });
    expect(mockRejectRequest).not.toHaveBeenCalled();

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
    } as never);
    rerender(props);

    await waitFor(() => {
      expect(mockRejectRequest).toHaveBeenCalledTimes(1);
    });
    expect(mockAddTransaction).toHaveBeenCalledTimes(2);
  });

  it('ignores a lookup failure after the user switches provider', async () => {
    let rejectLookup: (error: Error) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((_resolve, reject) => {
          rejectLookup = reject;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    rerender({ destination: 'hyperliquid', source: 'hyperliquid' });
    rejectLookup(new Error('network down'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('does not create the deposit after the user switches back before the lookup finishes', async () => {
    let resolveLookup: (response: unknown) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const addTransactionCallsBefore = mockAddTransaction.mock.calls.length;

    const { rerender } = renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    rerender({ destination: 'hyperliquid', source: 'hyperliquid' });
    resolveLookup({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });

    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
        address: USER,
        exists: false,
      });
    });

    // Wait a bit to ensure no transaction was added
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAddTransaction).toHaveBeenCalledTimes(addTransactionCallsBefore);
    expect(mockRejectRequest).not.toHaveBeenCalled();
  });

  it('does not create the deposit again for the same confirmation', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const props: Selection = {
      destination: 'lighter',
      source: 'hyperliquid',
    };
    const { rerender } = renderSync(props);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
    } as never);
    rerender(props);

    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('marks lookup as pending during account verification', async () => {
    let resolveLookup: (response: unknown) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    const { result } = renderHook(() =>
      useLighterAccountLookupState(hyperliquidDeposit.id),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.error).toBeUndefined();

    resolveLookup({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.error).toBeUndefined();
  });

  it('marks lookup as failed when verification rejects', async () => {
    let rejectLookup: (error: Error) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((_resolve, reject) => {
          rejectLookup = reject;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    const { result } = renderHook(() =>
      useLighterAccountLookupState(hyperliquidDeposit.id),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(true);
    });

    const lookupError = new Error('Network timeout');
    rejectLookup(lookupError);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Network timeout');
  });

  it('does not call addTransaction when unmounted before lookup finishes', async () => {
    let resolveLookup: (response: unknown) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const addTransactionCallsBefore = mockAddTransaction.mock.calls.length;

    const { unmount } = renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    unmount();

    resolveLookup({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });

    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
        address: USER,
        exists: false,
      });
    });

    // Wait a bit to ensure no transaction was added
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAddTransaction).toHaveBeenCalledTimes(addTransactionCallsBefore);
    expect(mockRejectRequest).not.toHaveBeenCalled();
  });

  it('marks lookup as failed when replacement fails', async () => {
    setEnteredAmount(hyperliquidDeposit.id, '2000000');
    mockFindNetworkClientId.mockReturnValue('mainnet');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );
    mockAddTransaction.mockRejectedValueOnce(new Error('Network error'));

    renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    const { result } = renderHook(() =>
      useLighterAccountLookupState(hyperliquidDeposit.id),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Network error');
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' }),
      'Failed to recreate the Perps transaction',
    );
  });

  it('continues lookup when transactionMeta object changes with same id and type', async () => {
    let resolveLookup: (response: unknown) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderSync({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    const { result } = renderHook(() =>
      useLighterAccountLookupState(hyperliquidDeposit.id),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(true);
    });

    // Simulate transactionMeta object changing (e.g., gas update) but same id/type
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      txParams: {
        ...hyperliquidDeposit.txParams,
        gas: '0x40000', // Different gas value
      },
    } as never);

    rerender({
      destination: 'lighter',
      source: 'hyperliquid',
    });

    // Should still be pending, not cancelled
    expect(result.current.isPending).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Not re-fired

    resolveLookup({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
