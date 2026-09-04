import React from 'react';
import { SwapQuotesProvider } from './SwapQuotesContext';
import { useSwapQuotes } from './index';
import {
  mockContext,
  runQuoteRequestCases,
} from '../useBridgeQuoteRequest/runQuoteRequestCases';
import { renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import {
  selectDestAddress,
  selectDestToken,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { runQuoteDataCases } from '../useBridgeQuoteData/runQuoteDataCases';
import type { BigNumber } from 'ethers';
import type { DebounceSettings } from 'lodash';

jest.mock('lodash', () => {
  const actual = jest.requireActual<typeof import('lodash')>('lodash');

  return {
    ...actual,
    debounce: ((
      fn: (...args: unknown[]) => unknown,
      wait?: number,
      options?: DebounceSettings,
    ) => {
      const debounced = actual.debounce(fn, wait, options);
      const flush = debounced.flush.bind(debounced);

      debounced.flush = (() => flush() ?? fn()) as typeof debounced.flush;

      return debounced;
    }) as typeof actual.debounce,
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(() => mockContext),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    validateBridgeTx: jest.fn(),
  }),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        configuration: {
          chainId: '0x1',
        },
      })),
    },
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectSourceToken: jest.fn(),
  selectSourceAmount: jest.fn(),
  selectDestToken: jest.fn(),
  selectSlippage: jest.fn(),
  selectDestAddress: jest.fn(),
  selectSelectedDestChainId: jest.fn(),
  selectBridgeControllerState: jest.fn().mockReturnValue({}),
  selectQuoteStreamComplete: jest.fn(),
  selectIsSolanaSwap: jest.fn(),
  selectIsSolanaToNonSolana: jest.fn(),
  selectSelectedQuoteRequestId: jest.fn(),
  selectIsSubmittingTx: jest.fn(),
  selectBridgeFeatureFlags: jest.fn(),
  selectBridgeQuotes: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
  selectGasIncludedQuoteParams: jest.fn().mockReturnValue({}),
  selectBatchSellSourceWalletAddress: jest.fn(),
  selectValidDestInternalAccountIds: jest.fn(),
  selectIsGasIncluded7702BridgeEnabled: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

const mockDebounceMs = 300;

const Wrapper = ({
  children,
  quoteRequestIndex,
  quoteRequestCount,
  ...options
}: {
  children: React.ReactNode;
  latestSourceAtomicBalance?: BigNumber;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
}) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);

  return (
    <SwapQuotesProvider
      featureId={FeatureId.UNIFIED_SWAP_BRIDGE}
      debounceWait={mockDebounceMs}
      quoteRequestIndex={quoteRequestIndex}
      quoteRequestCount={quoteRequestCount}
      quoteParams={{
        srcAmount: sourceAmount,
        srcToken: sourceToken,
        destToken,
        slippage,
        walletAddress,
        destWalletAddress: destAddress,
      }}
      {...('latestSourceAtomicBalance' in options
        ? { latestSourceAtomicBalance: options.latestSourceAtomicBalance }
        : {})}
    >
      {children}
    </SwapQuotesProvider>
  );
};

describe('useSwapQuotes', () => {
  it('throws an error if used outside of SwapQuotesProvider', () => {
    expect(() => renderHook(() => useSwapQuotes())).toThrow(
      'useSwapQuotes must be used within SwapQuotesProvider',
    );
  });
});

runQuoteRequestCases({
  name: 'useQuoteRequest',
  debounceMs: mockDebounceMs,
  renderHook: (options) =>
    renderHook(
      () => {
        const { debouncedUpdateQuoteParams, refreshQuotes } = useSwapQuotes();

        return Object.assign(debouncedUpdateQuoteParams, { refreshQuotes });
      },
      {
        wrapper: ({ children }) => <Wrapper {...options}>{children}</Wrapper>,
      },
    ),
});

runQuoteDataCases({
  name: 'useQuoteData',
  mockDispatch,
  renderHook: (options) =>
    renderHook(() => useSwapQuotes(), {
      wrapper: ({ children }) => <Wrapper {...options}>{children}</Wrapper>,
    }),
});
