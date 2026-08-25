import React from 'react';
import { BridgeQuotesProvider } from './BridgeQuotesContext';
import { useBridgeQuotes } from './index';
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
import { TraceName } from '../../../../../util/trace';
import { runQuoteDataCases } from '../useBridgeQuoteData/runQuoteDataCases';
import type { BigNumber } from 'ethers';

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
  latestSourceAtomicBalance,
}: {
  children: React.ReactNode;
  latestSourceAtomicBalance?: BigNumber;
}) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);

  return (
    <BridgeQuotesProvider
      featureId={FeatureId.UNIFIED_SWAP_BRIDGE}
      traceName={TraceName.SwapQuoteFetch}
      latestSourceAtomicBalance={latestSourceAtomicBalance}
      debounceWait={mockDebounceMs}
      quoteParams={{
        srcAmount: sourceAmount,
        srcToken: sourceToken,
        destToken,
        slippage,
        walletAddress,
        destWalletAddress: destAddress,
      }}
    >
      {children}
    </BridgeQuotesProvider>
  );
};

runQuoteRequestCases({
  name: 'useQuoteRequest',
  debounceMs: mockDebounceMs,
  renderHook: (options) =>
    renderHook(() => useBridgeQuotes().debouncedUpdateQuoteParams, {
      wrapper: ({ children }) => (
        <Wrapper latestSourceAtomicBalance={options?.latestSourceAtomicBalance}>
          {children}
        </Wrapper>
      ),
    }),
});

runQuoteDataCases({
  name: 'useQuoteData',
  mockDispatch,
  renderHook: (options) =>
    renderHook(() => useBridgeQuotes(), {
      wrapper: ({ children }) => (
        <Wrapper latestSourceAtomicBalance={options?.latestSourceAtomicBalance}>
          {children}
        </Wrapper>
      ),
    }),
});
