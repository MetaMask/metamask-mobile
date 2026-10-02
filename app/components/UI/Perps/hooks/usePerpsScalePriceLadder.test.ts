import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  InitializationState,
  type GetScalePriceLadderParams,
  type PerpsScalePriceLadder,
} from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { usePerpsScalePriceLadder } from './usePerpsScalePriceLadder';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: { PerpsController: { getScalePriceLadder: jest.fn() } },
}));

const mockGetLadder = jest.mocked(
  Engine.context.PerpsController.getScalePriceLadder,
);
const mockUseSelector = jest.mocked(useSelector);
const params: GetScalePriceLadderParams = {
  symbol: 'ETH',
  minPrice: 2000,
  maxPrice: 2200,
  count: 3,
  providerId: 'lighter',
};
const ready: PerpsScalePriceLadder = {
  status: 'ready',
  providerId: 'lighter',
  prices: ['2000', '2100', '2200'],
};
const heldResult = () => {
  let resolve!: (result: PerpsScalePriceLadder) => void;
  const promise = new Promise<PerpsScalePriceLadder>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

describe('usePerpsScalePriceLadder', () => {
  const savedDev = __DEV__;
  let account: string;
  let network: string;
  let provider: string;
  let initialization: InitializationState;

  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.clearAllMocks();
    account = '0x1111111111111111111111111111111111111111';
    network = 'testnet';
    provider = 'lighter';
    initialization = InitializationState.Initialized;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) return account;
      if (selector === selectPerpsNetwork) return network;
      if (selector === selectPerpsProvider) return provider;
      if (selector === selectPerpsInitializationState) return initialization;
      return undefined;
    });
    mockGetLadder.mockResolvedValue(ready);
  });
  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  });

  it('returns the provider preview after the current request settles', async () => {
    const { result } = renderHook(() => usePerpsScalePriceLadder(params));

    await waitFor(() => expect(result.current.result).toEqual(ready));

    expect(mockGetLadder).toHaveBeenCalledWith(params);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('makes no request while inputs are absent', () => {
    const { result } = renderHook(() => usePerpsScalePriceLadder(undefined));

    expect(mockGetLadder).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('makes no request while the controller is uninitialized', () => {
    initialization = InitializationState.Uninitialized;

    const { result } = renderHook(() => usePerpsScalePriceLadder(params));

    expect(mockGetLadder).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('rejects a ready preview from a different provider', async () => {
    mockGetLadder.mockResolvedValue({ ...ready, providerId: 'hyperliquid' });

    const { result } = renderHook(() => usePerpsScalePriceLadder(params));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.result).toBeNull();
    expect(result.current.error?.message).toBe(
      'Scale preview provider differs from requested route',
    );
  });

  it.each(['account', 'network', 'provider', 'inputs', 'initialization'])(
    'discards a held result after %s changes and returns',
    async (changed) => {
      const pending = heldResult();
      mockGetLadder.mockReturnValueOnce(pending.promise);
      const { result, rerender } = renderHook(
        (input: GetScalePriceLadderParams) => usePerpsScalePriceLadder(input),
        { initialProps: params },
      );
      const original = { account, network, provider, initialization };
      const isOriginalOwnerCurrent = result.current.isCurrent;
      const originalGeneration = result.current.observationGeneration;

      if (changed === 'account')
        account = '0x2222222222222222222222222222222222222222';
      if (changed === 'network') network = 'mainnet';
      if (changed === 'provider') provider = 'hyperliquid';
      if (changed === 'initialization')
        initialization = InitializationState.Uninitialized;
      rerender(changed === 'inputs' ? { ...params, minPrice: 1900 } : params);
      ({ account, network, provider, initialization } = original);
      rerender(params);
      await waitFor(() => expect(result.current.result).toEqual(ready));
      await act(async () => {
        pending.resolve({ ...ready, prices: ['old', 'stale', 'result'] });
        await pending.promise;
      });

      expect(result.current.result).toEqual(ready);
      expect(result.current.isLoading).toBe(false);
      expect(isOriginalOwnerCurrent()).toBe(false);
      expect(result.current.isCurrent()).toBe(true);
      expect(result.current.observationGeneration).not.toBe(originalGeneration);
      expect(result.current.observationSequence).toBe(1);
    },
  );

  it('hides the settled preview immediately when account changes', async () => {
    const { result, rerender } = renderHook(() =>
      usePerpsScalePriceLadder(params),
    );
    await waitFor(() => expect(result.current.result).toEqual(ready));
    const pending = heldResult();
    mockGetLadder.mockReturnValue(pending.promise);

    account = '0x2222222222222222222222222222222222222222';
    rerender(undefined);

    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await act(async () => pending.resolve(ready));
  });

  it('returns null from a held refresh after unmount', async () => {
    const { result, unmount } = renderHook(() =>
      usePerpsScalePriceLadder(params),
    );
    await waitFor(() => expect(result.current.result).toEqual(ready));
    const pending = heldResult();
    mockGetLadder.mockReturnValue(pending.promise);
    let response!: Promise<PerpsScalePriceLadder | null>;

    act(() => {
      response = result.current.refresh();
    });
    unmount();
    await act(async () => pending.resolve(ready));

    await expect(response).resolves.toBeNull();
  });

  it('keeps the newest same-context refresh when earlier refresh resolves last', async () => {
    const { result } = renderHook(() => usePerpsScalePriceLadder(params));
    await waitFor(() => expect(result.current.result).toEqual(ready));
    const first = heldResult();
    const second = heldResult();
    mockGetLadder
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    let earlier!: Promise<PerpsScalePriceLadder | null>;
    let latest!: Promise<PerpsScalePriceLadder | null>;

    act(() => {
      earlier = result.current.refresh();
      latest = result.current.refresh();
    });
    await act(async () => second.resolve(ready));
    await act(async () => first.resolve({ ...ready, prices: ['old'] }));

    await expect(earlier).resolves.toBeNull();
    await expect(latest).resolves.toEqual(ready);
    expect(result.current.result).toEqual(ready);
  });
});
