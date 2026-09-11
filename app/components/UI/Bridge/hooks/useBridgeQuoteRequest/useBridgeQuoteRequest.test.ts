import { renderHook } from '@testing-library/react-native';

import { useBridgeQuoteRequest } from './';
import { mockContext, runQuoteRequestCases } from './runQuoteRequestCases';
import type { DebounceSettings } from 'lodash';
import { FeatureId } from '@metamask/bridge-controller';
import { DEBOUNCE_WAIT } from '../../Views/BridgeView/BridgeView.constants';

/**
 * Unit fallback: debounce, swap-quote traces, and BridgeController request
 * params cannot be driven from CV without a live quote stream.
 */

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

jest.mock('../useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

runQuoteRequestCases({
  name: 'useBridgeQuoteRequest',
  debounceMs: DEBOUNCE_WAIT,
  renderHook: (options) => renderHook(() => useBridgeQuoteRequest(options)),
  featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
});
