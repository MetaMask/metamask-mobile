import { renderHook } from '@testing-library/react-native';

import { DEBOUNCE_WAIT, useBridgeQuoteRequest } from './';
import { mockContext, runQuoteRequestCases } from './runQuoteRequestCases';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
  },
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(() => mockContext),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

runQuoteRequestCases({
  name: 'useBridgeQuoteRequest',
  debounceMs: DEBOUNCE_WAIT,
  renderHook: (options) => renderHook(() => useBridgeQuoteRequest(options)),
});
