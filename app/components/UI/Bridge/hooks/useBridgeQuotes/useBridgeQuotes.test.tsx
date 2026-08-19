import { useBridgeQuotes, BridgeQuotesProvider } from './BridgeQuotesContext';
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
        destToken: destToken,
        slippage: slippage,
        walletAddress: walletAddress,
        destWalletAddress: destAddress,
      }}
    >
      {children}
    </BridgeQuotesProvider>
  );
};

runQuoteRequestCases({
  debounceMs: mockDebounceMs,
  renderHook: (options) =>
    renderHook(() => useBridgeQuotes().debouncedUpdateQuoteParams, {
      wrapper: ({ children }) => {
        return (
          <Wrapper
            latestSourceAtomicBalance={options?.latestSourceAtomicBalance}
          >
            {children}
          </Wrapper>
        );
      },
    }),
});
