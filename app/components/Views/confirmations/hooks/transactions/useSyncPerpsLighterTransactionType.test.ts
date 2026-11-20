import { renderHook, waitFor } from '@testing-library/react-native';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { LIGHTER_BRIDGE_CONFIG } from '@metamask/perps-controller/constants/lighterConfig';

import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { generateTransferData } from '../../../../../util/transactions';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useSyncPerpsLighterTransactionType } from './useSyncPerpsLighterTransactionType';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionController: {
      updateTransactionMetadata: jest.fn(),
    },
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
      state: { transactionData: {} },
    },
  },
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
const mockUpdateTransactionMetadata = jest.mocked(
  Engine.context.TransactionController.updateTransactionMetadata,
);
const mockSetTransactionConfig = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);
const mockFindNetworkClientId = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);

const USER = '0x1111111111111111111111111111111111111111';
const HYPERLIQUID_BRIDGE = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';
const { bridgeContract, usdcContract } = LIGHTER_BRIDGE_CONFIG.mainnet;

const hyperliquidDeposit = {
  id: 'tx-1',
  chainId: '0xa4b1',
  networkClientId: 'arbitrum',
  origin: 'metamask',
  txParams: {
    from: USER,
    to: HYPERLIQUID_BRIDGE,
    data: '0x1234',
    value: '0x0',
  },
  type: TransactionType.perpsDeposit,
  nestedTransactions: [
    {
      data: '0x1234',
      to: HYPERLIQUID_BRIDGE,
      value: '0x0',
    },
  ],
  requiredAssets: [
    {
      address: HYPERLIQUID_BRIDGE,
      amount: '0x1',
    },
  ],
};

function readPaymentOverride(callIndex = 0): string | undefined {
  const config: { paymentOverride?: string } = {};
  const setConfig = mockSetTransactionConfig.mock.calls[callIndex]?.[1];
  setConfig?.(config as never);
  return config.paymentOverride;
}

function applyMetadataUpdate(callIndex = 0): TransactionMeta {
  const meta = {
    chainId: hyperliquidDeposit.chainId,
    networkClientId: hyperliquidDeposit.networkClientId,
    txParams: { ...hyperliquidDeposit.txParams },
    type: hyperliquidDeposit.type,
  } as TransactionMeta;
  mockUpdateTransactionMetadata.mock.calls[callIndex]?.[0].callback(meta);
  return meta;
}

describe('useSyncPerpsLighterTransactionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindNetworkClientId.mockReturnValue('mainnet');
    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [
          {
            amountHuman: '2',
            amountRaw: '2000000',
          },
        ],
      },
    } as never;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 21100, message: 'account not found' }),
    });
  });

  it('replaces the Hyperliquid bridge call when the address has no Lighter account', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockSetTransactionConfig).toHaveBeenCalledTimes(1);
    });

    expect(readPaymentOverride()).toBeUndefined();
    expect(mockSetTransactionConfig.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateTransactionMetadata.mock.invocationCallOrder[0],
    );

    const meta = applyMetadataUpdate();
    expect(meta.type).toBe(TransactionType.perpsLighterDeposit);
    expect(meta.chainId).toBe('0x1');
    expect(meta.networkClientId).toBe('mainnet');
    expect(meta.txParams.to).toBe(USER);
    expect(meta.txParams.to).not.toBe(HYPERLIQUID_BRIDGE);
    expect(meta.nestedTransactions).toHaveLength(2);
    expect(meta.nestedTransactions?.[0].to).toBe(usdcContract);
    expect(meta.nestedTransactions?.[1].to).toBe(bridgeContract);
    expect(meta.nestedTransactions?.[1].data?.startsWith('0x8a857083')).toBe(
      true,
    );
    expect(meta.requiredAssets?.[0]).toStrictEqual(
      expect.objectContaining({
        address: usdcContract,
        amount: '0x1e8480',
        standard: 'erc20',
      }),
    );
  });

  it('keeps the Hyperliquid confirmation when the address already has a Lighter account', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [{}] }),
    });
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
        address: USER,
        exists: true,
      });
    });

    expect(mockUpdateTransactionMetadata).not.toHaveBeenCalled();
    expect(mockSetTransactionConfig).not.toHaveBeenCalled();
  });

  it('reloads the quote target when the address has no Lighter account', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: [] }),
    });
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
      address: USER,
      exists: false,
    });
    expect(readPaymentOverride()).toBeUndefined();

    const meta = applyMetadataUpdate();
    expect(meta.type).toBe(TransactionType.perpsLighterDeposit);
    expect(meta.chainId).toBe('0x1');
    expect(meta.requiredAssets?.[0]).toStrictEqual(
      expect.objectContaining({
        address: usdcContract,
        amount: '0x1e8480',
        standard: 'erc20',
      }),
    );
  });

  it('logs whether the address has a Lighter account', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith('Lighter account lookup', {
        address: USER,
        exists: false,
      });
    });
  });

  it('restores the Hyperliquid call when the user switches back', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderHook<
      void,
      {
        destination: 'hyperliquid' | 'lighter';
        source: 'hyperliquid' | 'lighter';
      }
    >(
      ({ destination, source }) =>
        useSyncPerpsLighterTransactionType({ destination, source }),
      {
        initialProps: {
          destination: 'lighter',
          source: 'hyperliquid',
        },
      },
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      chainId: '0x1',
      networkClientId: 'mainnet',
      type: TransactionType.perpsLighterDeposit,
    } as never);

    rerender({ destination: 'hyperliquid', source: 'lighter' });

    const meta = applyMetadataUpdate(1);
    expect(meta.type).toBe(TransactionType.perpsDeposit);
    expect(meta.chainId).toBe('0xa4b1');
    expect(meta.networkClientId).toBe('arbitrum');
    expect(meta.txParams.to).toBe(HYPERLIQUID_BRIDGE);
    expect(meta.nestedTransactions?.[0].to).toBe(HYPERLIQUID_BRIDGE);
    expect(meta.requiredAssets?.[0].address).toBe(HYPERLIQUID_BRIDGE);
    expect(readPaymentOverride(1)).toBeUndefined();
  });

  it('restores the Hyperliquid transfer with the amount committed on Lighter', async () => {
    const arbitrumUsdc = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
    const transferData = (amount: number) =>
      generateTransferData('transfer', {
        toAddress: HYPERLIQUID_BRIDGE,
        amount: amount.toString(16),
      });
    const hyperliquidTransfer = {
      ...hyperliquidDeposit,
      txParams: {
        ...hyperliquidDeposit.txParams,
        to: arbitrumUsdc,
        data: transferData(2_000_000),
      },
      nestedTransactions: [
        { data: transferData(2_000_000), to: arbitrumUsdc, value: '0x0' },
      ],
      requiredAssets: [{ address: arbitrumUsdc, amount: '0x1e8480' }],
    };
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidTransfer as never,
    );

    const { rerender } = renderHook<
      void,
      {
        destination: 'hyperliquid' | 'lighter';
        source: 'hyperliquid' | 'lighter';
      }
    >(
      ({ destination, source }) =>
        useSyncPerpsLighterTransactionType({ destination, source }),
      { initialProps: { destination: 'lighter', source: 'hyperliquid' } },
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [{ amountHuman: '80', amountRaw: '80000000' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidTransfer,
      chainId: '0x1',
      networkClientId: 'mainnet',
      type: TransactionType.perpsLighterDeposit,
    } as never);

    rerender({ destination: 'hyperliquid', source: 'hyperliquid' });

    const meta = applyMetadataUpdate(1);
    const decoded = parseStandardTokenTransactionData(meta.txParams.data);
    expect(meta.type).toBe(TransactionType.perpsDeposit);
    expect(meta.txParams.to).toBe(arbitrumUsdc);
    expect(decoded?.args?._to.toLowerCase()).toBe(HYPERLIQUID_BRIDGE);
    expect(decoded?.args?._value.toString()).toBe('80000000');
    expect(meta.nestedTransactions?.[0].data).toBe(meta.txParams.data);
    expect(meta.requiredAssets?.[0]).toStrictEqual({
      address: arbitrumUsdc,
      amount: '0x4c4b400',
    });
  });

  it('leaves the confirmation unchanged when it already has the selected type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'hyperliquid',
      }),
    );

    expect(mockUpdateTransactionMetadata).not.toHaveBeenCalled();
    expect(mockSetTransactionConfig).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves the confirmation unchanged when no transaction is open', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    expect(mockUpdateTransactionMetadata).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not look the account up again for the same address', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    const props = {
      destination: 'hyperliquid' as const,
      source: 'lighter' as const,
    };
    const { rerender } = renderHook<void, typeof props>(
      (next) => useSyncPerpsLighterTransactionType(next),
      { initialProps: props },
    );

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

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'lighter',
      }),
    );

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'network down' }),
        'Failed to look up the Lighter account',
      );
    });
  });

  it('clears the override for a withdraw and keeps the confirmation chain', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'lighter',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    const meta = applyMetadataUpdate();
    expect(meta.type).toBe(TransactionType.perpsLighterWithdraw);
    expect(meta.chainId).toBe('0xa4b1');
    expect(readPaymentOverride()).toBeUndefined();
  });

  it('writes the deposit after replacing an address that is not an address', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      txParams: { ...hyperliquidDeposit.txParams, from: 'not-an-address' },
    } as never);

    const props = {
      destination: 'lighter' as const,
      source: 'hyperliquid' as const,
    };
    const { rerender } = renderHook<void, typeof props>(
      (next) => useSyncPerpsLighterTransactionType(next),
      { initialProps: props },
    );

    expect(mockSetTransactionConfig).not.toHaveBeenCalled();

    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );
    rerender(props);

    await waitFor(() => {
      expect(mockSetTransactionConfig).toHaveBeenCalledTimes(1);
    });
  });

  it('logs when no Ethereum mainnet client is available', async () => {
    mockFindNetworkClientId.mockReturnValue('');
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'No Ethereum mainnet network client for the Lighter USDC deposit',
        }),
        'Failed to update the Perps confirmation for the selected provider',
      );
    });
    expect(mockSetTransactionConfig).not.toHaveBeenCalled();
  });

  it('logs when the account lookup rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'network down' }),
        'Failed to look up the Lighter account',
      );
    });
    expect(mockSetTransactionConfig).not.toHaveBeenCalled();
  });

  it('ignores a lookup failure after the user switches provider', async () => {
    let rejectLookup: (error: Error) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectLookup = reject;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderHook<
      void,
      {
        destination: 'hyperliquid' | 'lighter';
        source: 'hyperliquid' | 'lighter';
      }
    >(
      ({ destination, source }) =>
        useSyncPerpsLighterTransactionType({ destination, source }),
      {
        initialProps: {
          destination: 'lighter',
          source: 'hyperliquid',
        },
      },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsLighterDeposit,
    } as never);
    rerender({ destination: 'hyperliquid', source: 'hyperliquid' });
    rejectLookup(new Error('network down'));

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('does not write the deposit after the user switches back before the lookup finishes', async () => {
    let resolveLookup: (response: unknown) => void = () => undefined;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const { rerender } = renderHook<
      void,
      {
        destination: 'hyperliquid' | 'lighter';
        source: 'hyperliquid' | 'lighter';
      }
    >(
      ({ destination, source }) =>
        useSyncPerpsLighterTransactionType({ destination, source }),
      {
        initialProps: {
          destination: 'lighter',
          source: 'hyperliquid',
        },
      },
    );

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
    expect(mockUpdateTransactionMetadata).not.toHaveBeenCalled();
    expect(mockSetTransactionConfig).not.toHaveBeenCalled();
  });

  it('does not write the deposit again for the same confirmation', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const props = {
      destination: 'lighter' as const,
      source: 'hyperliquid' as const,
    };
    const { rerender } = renderHook<void, typeof props>(
      (next) => useSyncPerpsLighterTransactionType(next),
      { initialProps: props },
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
    } as never);
    rerender(props);

    expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
  });

  it('logs when restoring the confirmation throws', () => {
    mockUpdateTransactionMetadata.mockImplementation(() => {
      throw new Error('metadata update failed');
    });
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsWithdraw,
    } as never);

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'lighter',
      }),
    );

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'metadata update failed' }),
      'Failed to update the Perps confirmation for the selected provider',
    );
  });

  it('uses the human amount when the raw amount is zero', async () => {
    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [{ amountHuman: '2', amountRaw: '0' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    const meta = applyMetadataUpdate();
    expect(meta.requiredAssets?.[0].amount).toBe('0x1e8480');
  });

  it('uses zero when the entered amount is empty', async () => {
    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [{ amountHuman: '0' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    const meta = applyMetadataUpdate();
    expect(meta.requiredAssets?.[0].amount).toBe('0x0');
  });

  it('uses zero when the entered amount is negative', async () => {
    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [{ amountHuman: '-1' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    const meta = applyMetadataUpdate();
    expect(meta.requiredAssets?.[0].amount).toBe('0x0');
  });

  it('uses the human amount when the raw amount is not a number', async () => {
    Engine.context.TransactionPayController.state.transactionData = {
      'tx-1': {
        isLoading: false,
        tokens: [{ amountHuman: '1', amountRaw: 'not-a-number' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    const meta = applyMetadataUpdate();
    expect(meta.requiredAssets?.[0].amount).toBe('0xf4240');
  });

  it('keeps the saved confirmation when a second deposit is written', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    const props = {
      destination: 'lighter' as const,
      source: 'hyperliquid' as const,
    };
    const { rerender } = renderHook<void, typeof props>(
      (next) => useSyncPerpsLighterTransactionType(next),
      { initialProps: props },
    );

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(1);
    });

    Engine.context.TransactionPayController.state.transactionData = {
      ...Engine.context.TransactionPayController.state.transactionData,
      'tx-2': {
        isLoading: false,
        tokens: [{ amountHuman: '2', amountRaw: '2000000' }],
      },
    } as never;
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      id: 'tx-2',
    } as never);
    rerender(props);

    await waitFor(() => {
      expect(mockUpdateTransactionMetadata).toHaveBeenCalledTimes(2);
    });
    expect(mockUpdateTransactionMetadata.mock.calls[1][0].transactionId).toBe(
      'tx-2',
    );
  });
});
