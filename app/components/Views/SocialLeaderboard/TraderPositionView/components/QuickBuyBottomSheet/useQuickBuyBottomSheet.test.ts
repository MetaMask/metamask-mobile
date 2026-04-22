import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { useSubmitQuickBuyTx } from './useSubmitQuickBuyTx';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useIsSendBundleSupported } from '../../../../../UI/Bridge/hooks/useIsSendBundleSupported';
import {
  getGaslessBridgeWith7702EnabledForChain,
  selectShouldUseSmartTransaction,
} from '../../../../../../selectors/smartTransactionsController';
import { selectIsGasIncluded7702Supported } from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Simple chainId helpers so inline selector lambdas in the hook evaluate
// predictably. Hex chain IDs are EVM; anything that starts with `solana` is
// treated as non-EVM for these tests. `FeatureId` is preserved from the real
// module because it is read at import time by constants.ts.
jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    formatChainIdToCaip: jest.fn((chainId: string) =>
      typeof chainId === 'string' && chainId.startsWith('solana')
        ? chainId
        : `eip155:${chainId}`,
    ),
    formatChainIdToHex: jest.fn((chainId: string) => chainId),
    isNonEvmChainId: jest.fn(
      (chainId: string | undefined) =>
        typeof chainId === 'string' && chainId.startsWith('solana'),
    ),
  };
});

jest.mock('./useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./useSourceTokenOptions', () => ({
  useSourceTokenOptions: jest.fn(),
}));

jest.mock('./useQuickBuyQuotes', () => ({
  useQuickBuyQuotes: jest.fn(),
}));

jest.mock('./useSubmitQuickBuyTx', () => ({
  useSubmitQuickBuyTx: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useIsSendBundleSupported', () => ({
  useIsSendBundleSupported: jest.fn(),
}));

jest.mock('../../../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
  getGaslessBridgeWith7702EnabledForChain: jest.fn(),
}));

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  selectIsGasIncluded7702Supported: jest.fn(),
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockSubmitQuickBuyTx = jest.fn();

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
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

const createSourceToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    currencyExchangeRate: 2000,
    balance: '1.0',
    balanceFiat: '$2000.00',
    tokenFiatAmount: 2000,
    ...overrides,
  }) as BridgeToken;

const createActiveQuote = () => ({
  quote: {
    srcTokenAmount: '10000000000000000',
  },
});

/** Default account map: any scope resolves to a wallet address. */
const defaultAccountByScope = () => ({ address: '0xWALLET' });

const setupDefaultMocks = () => {
  // Each useSelector call is invoked with a dummy state `{}`. Inline lambdas
  // in the hook delegate to the mocked module-level selectors, so we just
  // control those selectors here.
  (useSelector as jest.Mock).mockImplementation(
    (selector: (state: unknown) => unknown) => selector({}),
  );

  (
    selectSelectedInternalAccountByScope as unknown as jest.Mock
  ).mockReturnValue(defaultAccountByScope);
  (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
    false,
  );
  (
    getGaslessBridgeWith7702EnabledForChain as unknown as jest.Mock
  ).mockReturnValue(false);
  (selectIsGasIncluded7702Supported as unknown as jest.Mock).mockReturnValue(
    false,
  );

  (useQuickBuySetup as jest.Mock).mockReturnValue({
    chainId: '0x1',
    destToken: {
      address: '0xDEST',
      chainId: '0x1',
      decimals: 18,
      symbol: 'TARGET',
      name: 'Target Token',
    },
    isLoading: false,
    isUnsupportedChain: false,
  });

  (useSourceTokenOptions as jest.Mock).mockReturnValue({
    options: [createSourceToken()],
    isLoading: false,
  });

  (useQuickBuyQuotes as jest.Mock).mockReturnValue({
    activeQuote: undefined,
    destTokenAmount: undefined,
    isQuoteLoading: false,
    quoteFetchError: null,
    isNoQuotesAvailable: false,
    blockaidError: null,
    isActiveQuoteForCurrentTokenPair: true,
  });

  (useLatestBalance as jest.Mock).mockReturnValue({
    atomicBalance: undefined,
    displayBalance: undefined,
  });

  (useIsInsufficientBalance as jest.Mock).mockReturnValue(false);
  (useHasSufficientGas as jest.Mock).mockReturnValue(true);
  (useIsSendBundleSupported as jest.Mock).mockReturnValue(false);
  (useSubmitQuickBuyTx as jest.Mock).mockReturnValue({
    submitQuickBuyTx: mockSubmitQuickBuyTx,
  });

  // Re-apply the bridge-controller helper impls because `jest.resetAllMocks()`
  // in afterEach wipes any `jest.fn()` implementation between tests.
  (isNonEvmChainId as jest.Mock).mockImplementation(
    (chainId: string | undefined) =>
      typeof chainId === 'string' && chainId.startsWith('solana'),
  );
  (formatChainIdToCaip as jest.Mock).mockImplementation((chainId: string) =>
    typeof chainId === 'string' && chainId.startsWith('solana')
      ? chainId
      : `eip155:${chainId}`,
  );
  (formatChainIdToHex as jest.Mock).mockImplementation(
    (chainId: string) => chainId,
  );
};

describe('useQuickBuyBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('handleAmountChange', () => {
    it('accepts valid numeric input', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.usdAmount).toBe('20');
    });

    it('normalizes a leading decimal without digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.');
      });

      expect(result.current.usdAmount).toBe('0.');
      expect(result.current.hasValidAmount).toBe(false);
    });

    it('normalizes a leading decimal with digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.5');
      });

      expect(result.current.usdAmount).toBe('0.5');
      expect(result.current.hasValidAmount).toBe(true);
    });
  });

  describe('handlePresetPress', () => {
    it('sets usdAmount to the preset value', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handlePresetPress('50');
      });

      expect(result.current.usdAmount).toBe('50');
    });
  });

  describe('getButtonLabel', () => {
    it('returns the buy label when all conditions are normal', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.trader_position.buy',
      );
    });

    it('returns insufficient funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
    });
  });

  describe('isConfirmDisabled', () => {
    it('is disabled when usdAmount is empty', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when amount is valid and there is no active quote', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when the source token is missing even if a quote exists', () => {
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [],
        isLoading: false,
      });
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: createActiveQuote(),
        destTokenAmount: undefined,
        isQuoteLoading: false,
        quoteFetchError: null,
        isNoQuotesAvailable: false,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.isConfirmLoading).toBe(false);
    });

    it('is disabled when a destination address is required but missing', () => {
      // Make the destination chain non-EVM (Solana) while source stays EVM.
      // That makes isEvmNonEvmBridge true, so a dest address is required.
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        destToken: {
          address: 'solanaDestTokenAddress',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          decimals: 6,
          symbol: 'TARGET',
          name: 'Target Token',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      // Return a wallet for the source (EVM) scope but no account for the
      // Solana dest scope.
      (
        selectSelectedInternalAccountByScope as unknown as jest.Mock
      ).mockReturnValue((scope: string) => {
        if (typeof scope === 'string' && scope.startsWith('solana')) {
          return undefined;
        }
        return { address: '0xWALLET' };
      });
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: createActiveQuote(),
        destTokenAmount: undefined,
        isQuoteLoading: false,
        quoteFetchError: null,
        isNoQuotesAvailable: false,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.isConfirmLoading).toBe(false);
    });

    it('is enabled after quote loading settles for the entered amount', () => {
      const quoteState: {
        activeQuote: ReturnType<typeof createActiveQuote> | undefined;
        destTokenAmount: string | undefined;
        isQuoteLoading: boolean;
        isNoQuotesAvailable: boolean;
        quoteFetchError: null;
        blockaidError: null;
        isActiveQuoteForCurrentTokenPair: boolean;
      } = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
        {
          initialProps: props,
        },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      quoteState.isQuoteLoading = true;
      rerender(props);

      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);
      rerender(props);

      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('is disabled when amount changes after quote loading settles', () => {
      const quoteState: {
        activeQuote: ReturnType<typeof createActiveQuote> | undefined;
        destTokenAmount: string | undefined;
        isQuoteLoading: boolean;
        isNoQuotesAvailable: boolean;
        quoteFetchError: null;
        blockaidError: null;
        isActiveQuoteForCurrentTokenPair: boolean;
      } = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
        {
          initialProps: props,
        },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      quoteState.isQuoteLoading = true;
      rerender(props);

      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);
      rerender(props);

      act(() => {
        result.current.handleAmountChange('30');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.isConfirmLoading).toBe(true);
    });
  });

  describe('source token auto-selection', () => {
    it('auto-selects the first option when options load', () => {
      const firstToken = createSourceToken({ symbol: 'ETH' });

      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [firstToken, createSourceToken({ symbol: 'USDC' })],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.sourceToken?.symbol).toBe('ETH');
    });
  });

  describe('handleClose', () => {
    it('calls the onClose prop', () => {
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

  describe('handleConfirm', () => {
    it('calls submitQuickBuyTx with the active quote and closes on success', async () => {
      const onClose = jest.fn();
      const activeQuote = createActiveQuote();
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        quoteFetchError: null,
        isNoQuotesAvailable: false,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });
      mockSubmitQuickBuyTx.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), onClose),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitQuickBuyTx).toHaveBeenCalledWith({
        quoteResponse: activeQuote,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does nothing when there is no active quote', async () => {
      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), onClose),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitQuickBuyTx).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('keeps the sheet open if submitQuickBuyTx throws', async () => {
      const onClose = jest.fn();
      const activeQuote = createActiveQuote();
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        quoteFetchError: null,
        isNoQuotesAvailable: false,
        blockaidError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });
      mockSubmitQuickBuyTx.mockRejectedValue(new Error('submit failed'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), onClose),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitQuickBuyTx).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
