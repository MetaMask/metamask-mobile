import { renderHook } from '@testing-library/react-hooks';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { selectPerpsProvider } from '../selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  discardPrewarmedDepositOrder,
  prewarmDepositOrder,
} from '../utils/prewarmedDepositOrder';
import { usePerpsConnection } from './usePerpsConnection';
import { usePerpsPrewarmDepositOrder } from './usePerpsPrewarmDepositOrder';
import { usePerpsTrading } from './usePerpsTrading';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Mirrors useFocusEffect's own `useEffect(callback, [callback])`, so the
  // callback's identity decides re-runs just as it does in the app. Focus is
  // implied by mounting: the effect runs on mount and cleans up on unmount.
  return {
    useFocusEffect: (callback: React.EffectCallback) =>
      useEffect(callback, [callback]),
  };
});

jest.mock('./usePerpsTrading', () => ({ usePerpsTrading: jest.fn() }));
jest.mock('./usePerpsConnection', () => ({ usePerpsConnection: jest.fn() }));

jest.mock('../utils/prewarmedDepositOrder', () => ({
  ...jest.requireActual('../utils/prewarmedDepositOrder'),
  prewarmDepositOrder: jest.fn(),
  discardPrewarmedDepositOrder: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUsePerpsTrading = jest.mocked(usePerpsTrading);
const mockUsePerpsConnection = jest.mocked(usePerpsConnection);
const mockPrewarmDepositOrder = jest.mocked(prewarmDepositOrder);
const mockDiscardPrewarmedDepositOrder = jest.mocked(
  discardPrewarmedDepositOrder,
);

describe('usePerpsPrewarmDepositOrder', () => {
  const mockDepositWithOrder = jest.fn();
  let mockActiveProvider: string | undefined;
  let mockAccountAddress: string | undefined;
  let mockIsInitialized: boolean;
  let cancelTask: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveProvider = PROVIDER_CONFIG.DefaultProvider;
    mockAccountAddress = '0xabc';
    mockIsInitialized = true;
    cancelTask = jest.fn();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsProvider) return mockActiveProvider;
      if (selector === selectPerpsSelectedAccountAddress)
        return mockAccountAddress;
      return undefined;
    });
    mockUsePerpsTrading.mockReturnValue({
      depositWithOrder: mockDepositWithOrder,
    } as unknown as ReturnType<typeof usePerpsTrading>);
    mockUsePerpsConnection.mockImplementation(
      () =>
        ({ isInitialized: mockIsInitialized }) as ReturnType<
          typeof usePerpsConnection
        >,
    );
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        (task as () => void)();
        return {
          then: jest.fn(),
          done: jest.fn(),
          cancel: cancelTask,
        } as unknown as ReturnType<
          typeof InteractionManager.runAfterInteractions
        >;
      });
  });

  it('prewarms for the active account and provider', () => {
    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true }));

    expect(mockPrewarmDepositOrder).toHaveBeenCalledWith(
      {
        accountAddress: '0xabc',
        providerId: PROVIDER_CONFIG.DefaultProvider,
      },
      expect.any(Function),
    );
  });

  it('prewarms against the default provider while aggregated', () => {
    mockActiveProvider = PROVIDER_CONFIG.AggregatedProvider;

    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true }));

    expect(mockPrewarmDepositOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: PROVIDER_CONFIG.DefaultProvider }),
      expect.any(Function),
    );
  });

  it('does not prewarm when disabled', () => {
    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: false }));

    expect(mockPrewarmDepositOrder).not.toHaveBeenCalled();
  });

  it('does not prewarm before the Perps connection is initialized', () => {
    mockIsInitialized = false;

    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true }));

    expect(mockPrewarmDepositOrder).not.toHaveBeenCalled();
  });

  it('does not prewarm without an EVM account address', () => {
    mockAccountAddress = undefined;

    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true }));

    expect(mockPrewarmDepositOrder).not.toHaveBeenCalled();
  });

  it('does not prewarm for a market pinned to another provider', () => {
    renderHook(() =>
      usePerpsPrewarmDepositOrder({
        enabled: true,
        marketProviderId: 'other-provider',
      }),
    );

    expect(mockPrewarmDepositOrder).not.toHaveBeenCalled();
  });

  it('prewarms for a market pinned to the deposit provider', () => {
    renderHook(() =>
      usePerpsPrewarmDepositOrder({
        enabled: true,
        marketProviderId: PROVIDER_CONFIG.DefaultProvider,
      }),
    );

    expect(mockPrewarmDepositOrder).toHaveBeenCalled();
  });

  it('does not prewarm for Lighter, which has no deposit-with-order route', () => {
    mockActiveProvider = 'lighter';

    renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true }));

    expect(mockPrewarmDepositOrder).not.toHaveBeenCalled();
  });

  it('discards an unclaimed transaction when leaving the screen', () => {
    const { unmount } = renderHook(() =>
      usePerpsPrewarmDepositOrder({ enabled: true }),
    );

    unmount();

    expect(cancelTask).toHaveBeenCalled();
    expect(mockDiscardPrewarmedDepositOrder).toHaveBeenCalledTimes(1);
  });

  it('does not discard on leave when it never prewarmed', () => {
    const { unmount } = renderHook(() =>
      usePerpsPrewarmDepositOrder({ enabled: false }),
    );

    unmount();

    expect(mockDiscardPrewarmedDepositOrder).not.toHaveBeenCalled();
  });

  it('does not re-prewarm when only the AB test array identity changes', () => {
    const abTests = () => [{ key: 'experiment', value: 'treatment' }];
    const { rerender } = renderHook(
      (props: { transactionActiveAbTests: TransactionActiveAbTestEntry[] }) =>
        usePerpsPrewarmDepositOrder({ enabled: true, ...props }),
      { initialProps: { transactionActiveAbTests: abTests() } },
    );

    rerender({ transactionActiveAbTests: abTests() });

    expect(mockPrewarmDepositOrder).toHaveBeenCalledTimes(1);
    expect(mockDiscardPrewarmedDepositOrder).not.toHaveBeenCalled();
  });

  it('swallows a prewarm failure so the tap can still create the transaction', () => {
    mockPrewarmDepositOrder.mockReturnValue(
      Promise.reject(new Error('prep failed')),
    );

    expect(() =>
      renderHook(() => usePerpsPrewarmDepositOrder({ enabled: true })),
    ).not.toThrow();
  });
});
