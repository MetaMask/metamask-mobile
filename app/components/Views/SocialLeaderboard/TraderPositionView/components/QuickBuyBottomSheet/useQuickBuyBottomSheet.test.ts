import { renderHook, act } from '@testing-library/react-native';
import { providerErrors } from '@metamask/rpc-errors';
import type { Position } from '@metamask/social-controllers';

import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';
import {
  createQuickBuyTransaction,
  ensureQuickBuyTokenRegistered,
} from './createQuickBuyTransaction';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';

jest.mock('./useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./createQuickBuyTransaction', () => ({
  createQuickBuyTransaction: jest.fn(),
  ensureQuickBuyTokenRegistered: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../store', () => ({
  store: {
    getState: jest.fn(() => ({})),
  },
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      ApprovalController: {
        rejectRequest: jest.fn(),
        acceptRequest: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0xAAAAABBBB00000000000000000000000000CCCCCC',
    tokenSymbol: 'TEST',
    tokenName: 'Test Token',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 0,
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
    ...overrides,
  }) as Position;

const setupDefaultMocks = () => {
  (useQuickBuySetup as jest.Mock).mockReturnValue({
    chainId: '0x2105',
    destToken: {
      address: '0xDEST0000000000000000000000000000000DEST0',
      chainId: '0x2105',
      decimals: 18,
      symbol: 'TARGET',
      name: 'Target Token',
    },
    isLoading: false,
    isUnsupportedChain: false,
  });

  (createQuickBuyTransaction as jest.Mock).mockResolvedValue({
    transactionId: 'tx-quickbuy-1',
    networkClientId: 'base-client',
  });
  (ensureQuickBuyTokenRegistered as jest.Mock).mockResolvedValue(undefined);
  (
    selectSelectedInternalAccountAddress as unknown as jest.Mock
  ).mockReturnValue('0x1111111111111111111111111111111111111111');
};

describe('useQuickBuyBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe('transaction lifecycle', () => {
    it('creates the quickBuy transaction when destination resolves', async () => {
      renderHook(() => useQuickBuyBottomSheet(createPosition(), jest.fn()));

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(ensureQuickBuyTokenRegistered).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '0x2105',
          tokenAddress: '0xDEST0000000000000000000000000000000DEST0',
          decimals: 18,
          symbol: 'TARGET',
        }),
      );
      expect(createQuickBuyTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          destChainId: '0x2105',
          destTokenAddress: '0xDEST0000000000000000000000000000000DEST0',
          fromAddress: '0x1111111111111111111111111111111111111111',
          amountHex: '0x0',
        }),
      );
    });

    it('does not create a transaction for unsupported (non-hex) chains', () => {
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: 'solana:mainnet',
        destToken: undefined,
        isLoading: false,
        isUnsupportedChain: true,
      });

      renderHook(() => useQuickBuyBottomSheet(createPosition(), jest.fn()));

      expect(createQuickBuyTransaction).not.toHaveBeenCalled();
    });

    it('rejects the pending approval on unmount if not confirmed', async () => {
      const { result, unmount } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.transactionId).toBe('tx-quickbuy-1');

      unmount();

      expect(
        Engine.context.ApprovalController.rejectRequest,
      ).toHaveBeenCalledWith(
        'tx-quickbuy-1',
        providerErrors.userRejectedRequest({
          message: 'Quick Buy dismissed by user',
        }),
      );
    });

    it('does not reject if markConfirmed was called', async () => {
      const { result, unmount } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.transactionId).toBe('tx-quickbuy-1');

      act(() => {
        result.current.markConfirmed();
      });

      unmount();

      expect(
        Engine.context.ApprovalController.rejectRequest,
      ).not.toHaveBeenCalled();
    });
  });

  describe('input handlers', () => {
    it('handleAmountChange accepts valid numeric input', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.usdAmount).toBe('20');
    });

    it('handleAmountChange rejects non-numeric characters', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('12abc.34');
      });

      expect(result.current.usdAmount).toBe('12.34');
    });

    it('handlePresetPress sets usdAmount to the preset value', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handlePresetPress('50');
      });

      expect(result.current.usdAmount).toBe('50');
    });

    it('handleClose calls the onClose prop', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), onClose),
      );

      act(() => {
        result.current.handleClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
