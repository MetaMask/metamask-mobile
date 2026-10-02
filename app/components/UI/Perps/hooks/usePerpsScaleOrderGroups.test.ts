import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  InitializationState,
  type ScaleOrderGroup,
} from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { usePerpsScaleOrderGroups } from './usePerpsScaleOrderGroups';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getScaleOrderGroups: jest.fn(),
      reviewScaleOrderGroups: jest.fn(),
      cancelOrder: jest.fn(),
    },
  },
}));
const controller = jest.mocked(Engine.context.PerpsController);
const group: ScaleOrderGroup = {
  groupId: 'lighter-scale:owned',
  orderId: 'lighter-scale:owned',
  providerId: 'lighter',
  symbol: 'BTC',
  walletAddress: '0x1111111111111111111111111111111111111111',
  network: 'testnet',
  accountIndex: 28,
  apiKeyIndex: 2,
  state: 'unknown',
  acceptedChildren: [],
  childOrderIds: [],
  submittedSize: '0.001',
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

describe('Scale group ownership actions', () => {
  let account: string;
  let network: string;
  let provider: string;
  beforeEach(() => {
    jest.clearAllMocks();
    account = group.walletAddress;
    network = 'testnet';
    provider = 'lighter';
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) return account;
      if (selector === selectPerpsNetwork) return network;
      if (selector === selectPerpsProvider) return provider;
      if (selector === selectPerpsInitializationState)
        return InitializationState.Initialized;
      return undefined;
    });
    controller.getScaleOrderGroups.mockResolvedValue([group]);
    controller.reviewScaleOrderGroups.mockResolvedValue([group]);
    controller.cancelOrder.mockResolvedValue({ success: true });
  });
  afterEach(() => PerpsCacheInvalidator._clearAllSubscribers());

  it('lists only wallet, network and provider-owned groups', async () => {
    controller.getScaleOrderGroups.mockResolvedValue([
      group,
      { ...group, walletAddress: '0x2222222222222222222222222222222222222222' },
      { ...group, providerId: 'hyperliquid' },
      { ...group, network: 'mainnet' },
    ]);
    const { result } = renderHook(usePerpsScaleOrderGroups);

    await waitFor(() => expect(result.current.groups).toEqual([group]));
  });

  it('cancels the exact original group reference and route', async () => {
    const onOrdersChanged = jest.fn();
    const { result } = renderHook(() =>
      usePerpsScaleOrderGroups({ onOrdersChanged }),
    );
    await waitFor(() => expect(result.current.groups).toHaveLength(1));

    await act(async () => result.current.cancel(result.current.groups[0]));

    expect(controller.cancelOrder).toHaveBeenCalledWith({
      orderId: group.groupId,
      symbol: 'BTC',
      providerId: 'lighter',
      orderType: 'scale',
    });
    expect(controller.reviewScaleOrderGroups).not.toHaveBeenCalled();
    expect(onOrdersChanged).toHaveBeenCalledTimes(1);
  });

  it('refuses a copied or replaced ownership reference', async () => {
    const { result } = renderHook(usePerpsScaleOrderGroups);
    await waitFor(() => expect(result.current.groups).toHaveLength(1));

    await act(async () => result.current.cancel({ ...group }));

    expect(controller.cancelOrder).not.toHaveBeenCalled();
  });

  it.each(['account', 'network', 'provider'] as const)(
    'retires held review after %s changes and returns',
    async (field) => {
      const pending = deferred<ScaleOrderGroup[]>();
      controller.reviewScaleOrderGroups.mockReturnValueOnce(pending.promise);
      const { result, rerender } = renderHook(usePerpsScaleOrderGroups);
      await waitFor(() => expect(result.current.groups).toHaveLength(1));
      let action!: Promise<void>;
      act(() => {
        action = result.current.review(result.current.groups[0]);
      });
      const old = { account, network, provider };
      if (field === 'account')
        account = '0x2222222222222222222222222222222222222222';
      if (field === 'network') network = 'mainnet';
      if (field === 'provider') provider = 'hyperliquid';
      rerender({});
      account = old.account;
      network = old.network;
      provider = old.provider;
      rerender({});
      await waitFor(() => expect(result.current.groups).toHaveLength(1));
      const reads = controller.getScaleOrderGroups.mock.calls.length;

      await act(async () => {
        pending.resolve([group]);
        await action;
      });

      expect(controller.getScaleOrderGroups).toHaveBeenCalledTimes(reads);
      expect(result.current.isPending).toBe(false);
    },
  );

  it('ends a held cancellation on unmount without a follow-up read', async () => {
    const pending = deferred<{ success: boolean }>();
    controller.cancelOrder.mockReturnValueOnce(pending.promise);
    const onOrdersChanged = jest.fn();
    const { result, unmount } = renderHook(() =>
      usePerpsScaleOrderGroups({ onOrdersChanged }),
    );
    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    let action!: Promise<void>;
    act(() => {
      action = result.current.cancel(result.current.groups[0]);
    });
    unmount();
    const reads = controller.getScaleOrderGroups.mock.calls.length;

    await act(async () => {
      pending.resolve({ success: true });
      await action;
    });

    expect(controller.getScaleOrderGroups).toHaveBeenCalledTimes(reads);
    expect(onOrdersChanged).not.toHaveBeenCalled();
  });

  it('retains uncertain groups when venue cancellation refuses acceptance', async () => {
    controller.cancelOrder.mockResolvedValue({
      success: false,
      error: 'Venue outcome is unresolved',
    });
    const { result } = renderHook(usePerpsScaleOrderGroups);
    await waitFor(() => expect(result.current.groups).toHaveLength(1));

    await act(async () => result.current.cancel(result.current.groups[0]));

    expect(result.current.groups).toEqual([group]);
    expect(result.current.error?.message).toBe('Venue outcome is unresolved');
    expect(controller.getScaleOrderGroups).toHaveBeenCalledTimes(1);
  });
});
