import { act } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { detachQuickBuyTradeStateCallback } from '../../../../QuickBuy/quickBuyTradeTracker';
import { showErrorToast } from '../../../hooks/toasts';
import {
  createPack,
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { usePackFunding } from './usePackFunding';

const mockNavigation = {
  getParent: () => undefined,
  getState: jest.fn(() => ({
    index: 0,
    routes: [{ name: Routes.GACHA.HOME as string }],
  })),
  addListener: jest.fn((_event: string, _listener: () => void) => jest.fn()),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: {
        generatePack: jest.fn(),
        dismissOperation: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../QuickBuy/quickBuyTradeTracker', () => ({
  detachQuickBuyTradeStateCallback: jest.fn(),
}));

jest.mock('../../../hooks/toasts', () => ({
  showErrorToast: jest.fn(),
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const mockGeneratePack = jest.mocked(
  Engine.context.GachaController.generatePack,
);
const mockDismissOperation = jest.mocked(
  Engine.context.GachaController.dismissOperation,
);
const mockAccountByScope = jest.fn();
const transactionId = 'funding-transaction';

const deferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderFunding = () => {
  const refresh = jest.fn<Promise<bigint | undefined>, []>();
  refresh.mockResolvedValue(50_000_000n);
  const onPurchased = jest.fn();
  const options: Parameters<typeof usePackFunding>[0] = {
    account: MOCK_ACCOUNT,
    balance: { baseUnits: 20_000_000n, formatted: '20.00', refresh },
    isFocused: true,
    onPurchased,
  };
  const hook = renderHookWithQueryClient(() => usePackFunding(options));
  return { ...hook, options, refresh, onPurchased };
};

const openFunding = (
  hook: ReturnType<typeof renderFunding>,
  pack = createPack(),
) => {
  act(() => hook.result.current.open(pack));
  const onTradeStateChange = hook.result.current.quickBuy?.onTradeStateChange;
  if (!onTradeStateChange) {
    throw new Error('Opening funding did not provide a trade callback');
  }
  return onTradeStateChange;
};

// Narrow lifecycle contract: settlement callbacks outlive the native Quick Buy
// sheet. Screen rendering and controller I/O are covered at their own seams;
// these tests isolate whether a retained callback still has purchase authority.
describe('usePackFunding', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockNavigation.getState.mockReturnValue({
      index: 0,
      routes: [{ name: Routes.GACHA.HOME }],
    });
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    mockGeneratePack.mockResolvedValue('purchased-pack-memo');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('pins the destination and prefills only the rounded-up shortfall', () => {
    const hook = renderFunding();

    openFunding(hook);

    expect(hook.result.current.quickBuy).toEqual({
      destinationAddress: MOCK_ACCOUNT.address,
      initialAmountUsd: 30,
      onTradeStateChange: expect.any(Function),
    });
    expect(hook.refresh).not.toHaveBeenCalled();
  });

  it('keeps the first authorized pack when funding is opened twice', async () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);

    await act(async () => {
      hook.result.current.open(createPack({ code: 'pokemon_25', price: 25 }));
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
    expect(mockGeneratePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: { code: 'pokemon_50', name: 'Elite Pokemon Pack', price: 50 },
    });
  });

  it.each(['before', 'after'] as const)(
    'purchases after settlement %s Quick Buy dismissal at the exact balance threshold',
    async (dismissalOrder) => {
      const hook = renderFunding();
      const onTradeStateChange = openFunding(hook);
      act(() => onTradeStateChange({ status: 'submitting' }));
      act(() => onTradeStateChange({ status: 'submitted', transactionId }));
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(mockGeneratePack).not.toHaveBeenCalled();

      await act(async () => {
        if (dismissalOrder === 'after') {
          hook.result.current.closeQuickBuy();
        }
        onTradeStateChange({ status: 'complete', transactionId });
      });
      if (dismissalOrder === 'before') {
        act(() => hook.result.current.closeQuickBuy());
      }

      expect(mockGeneratePack).toHaveBeenCalledTimes(1);
      expect(mockGeneratePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: { code: 'pokemon_50', name: 'Elite Pokemon Pack', price: 50 },
      });
      expect(hook.onPurchased).toHaveBeenCalledTimes(1);
      expect(hook.onPurchased).toHaveBeenCalledWith('purchased-pack-memo');
      expect(mockDismissOperation).not.toHaveBeenCalled();
      expect(hook.result.current.isBusy).toBe(false);
    },
  );

  it('keeps waiting after submission and sheet dismissal', () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);

    act(() => {
      onTradeStateChange({ status: 'submitting' });
      hook.result.current.closeQuickBuy();
      onTradeStateChange({ status: 'submitted', transactionId });
    });

    expect(hook.result.current.quickBuy).toBeUndefined();
    expect(hook.result.current.phase).toBe('funding');
    expect(hook.result.current.canCancel).toBe(true);
    expect(hook.refresh).not.toHaveBeenCalled();
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it('does not purchase after a failed trade', async () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);

    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'failed', transactionId });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    expect(hook.result.current.error).toBe(strings('gacha.funding.failed'));
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.refresh).not.toHaveBeenCalled();
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it('revokes an unsubmitted intent when Quick Buy is dismissed', async () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);

    await act(async () => {
      hook.result.current.closeQuickBuy();
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.refresh).not.toHaveBeenCalled();
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it('purchases only once for repeated settlement callbacks', async () => {
    const hook = renderFunding();
    const balanceRequest = deferred<bigint>();
    hook.refresh.mockReturnValue(balanceRequest.promise);
    const onTradeStateChange = openFunding(hook);

    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
      onTradeStateChange({ status: 'complete', transactionId });
      balanceRequest.resolve(50_000_000n);
    });
    await act(async () =>
      onTradeStateChange({ status: 'complete', transactionId }),
    );

    expect(hook.refresh).toHaveBeenCalledTimes(1);
    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
    expect(hook.onPurchased).toHaveBeenCalledTimes(1);
  });

  it('waits for a sufficient refreshed balance before purchasing', async () => {
    const hook = renderFunding();
    hook.refresh
      .mockResolvedValueOnce(49_999_999n)
      .mockResolvedValue(50_000_000n);
    const onTradeStateChange = openFunding(hook);
    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });
    expect(mockGeneratePack).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTimeAsync(1_000));

    expect(hook.refresh).toHaveBeenCalledTimes(2);
    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
  });

  it('stops checking after five seconds of insufficient balance', async () => {
    const hook = renderFunding();
    hook.refresh.mockResolvedValue(49_999_999n);
    const onTradeStateChange = openFunding(hook);
    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    await act(async () => jest.advanceTimersByTimeAsync(5_000));
    hook.refresh.mockResolvedValue(50_000_000n);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));

    expect(hook.refresh).toHaveBeenCalledTimes(5);
    expect(mockGeneratePack).not.toHaveBeenCalled();
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.result.current.error).toBe(
      strings('gacha.funding.balance_not_ready'),
    );
  });

  it('does not purchase when the settled funding arrives net of fees', async () => {
    // 20 USDC held, 30 USDC requested for a 50 USDC pack; route fees take 0.15.
    const hook = renderFunding();
    hook.refresh.mockResolvedValue(49_850_000n);
    const onTradeStateChange = openFunding(hook);
    expect(hook.result.current.quickBuy?.initialAmountUsd).toBe(30);

    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });
    await act(async () => jest.advanceTimersByTimeAsync(5_000));

    expect(mockGeneratePack).not.toHaveBeenCalled();
    expect(hook.onPurchased).not.toHaveBeenCalled();
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.result.current.error).toBe(
      strings('gacha.funding.balance_not_ready'),
    );
  });

  it('expires an unresolved balance request without purchasing on its late response', async () => {
    const hook = renderFunding();
    const balanceRequest = deferred<bigint>();
    hook.refresh.mockReturnValue(balanceRequest.promise);
    const onTradeStateChange = openFunding(hook);
    act(() => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    await act(async () => jest.advanceTimersByTimeAsync(5_000));
    await act(async () => balanceRequest.resolve(50_000_000n));

    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.result.current.error).toBe(
      strings('gacha.funding.balance_not_ready'),
    );
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'leaving Gacha', 'account switch'] as const)(
    'revokes retained callbacks on %s',
    async (reason) => {
      const hook = renderFunding();
      const onTradeStateChange = openFunding(hook);
      act(() => onTradeStateChange({ status: 'submitting' }));

      act(() => {
        if (reason === 'cancel') {
          hook.result.current.cancel();
        } else if (reason === 'leaving Gacha') {
          hook.unmount();
        } else {
          hook.options.account = { ...MOCK_ACCOUNT, id: 'different-account' };
          hook.rerender(undefined);
        }
      });
      await act(async () =>
        onTradeStateChange({ status: 'complete', transactionId }),
      );

      expect(hook.refresh).not.toHaveBeenCalled();
      expect(mockGeneratePack).not.toHaveBeenCalled();
      expect(hook.onPurchased).not.toHaveBeenCalled();
    },
  );

  it('keeps the intent while another screen covers Gacha home', async () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => onTradeStateChange({ status: 'submitting' }));

    act(() => {
      hook.options.isFocused = false;
      hook.rerender(undefined);
    });
    expect(hook.result.current.phase).toBe('funding');
    await act(async () =>
      onTradeStateChange({ status: 'complete', transactionId }),
    );

    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
    expect(hook.onPurchased).toHaveBeenCalledWith('purchased-pack-memo');
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('keeps the Quick Buy sheet open while one of its screens covers Gacha home', () => {
    const hook = renderFunding();
    openFunding(hook);

    act(() => {
      hook.options.isFocused = false;
      hook.rerender(undefined);
    });

    expect(hook.result.current.quickBuy).toBeDefined();
    expect(hook.result.current.phase).toBe('editing');
  });

  it.each([Routes.GACHA.CARD, Routes.BRIDGE.MODALS.ROOT])(
    'retains the intent while %s is foreground',
    async (name) => {
      const hook = renderFunding();
      const onTradeStateChange = openFunding(hook);
      act(() => onTradeStateChange({ status: 'submitting' }));

      act(() => {
        mockNavigation.getState.mockReturnValue({
          index: 0,
          routes: [{ name }],
        });
        mockNavigation.addListener.mock.calls[0][1]();
      });
      await act(async () =>
        onTradeStateChange({ status: 'complete', transactionId }),
      );

      expect(hook.onPurchased).toHaveBeenCalledWith('purchased-pack-memo');
    },
  );

  it('revokes the intent when Browser covers the still-mounted Gacha stack', async () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'submitted', transactionId });
    });

    act(() => {
      mockNavigation.getState.mockReturnValue({
        index: 1,
        routes: [{ name: Routes.GACHA.ROOT }, { name: Routes.BROWSER.HOME }],
      });
      mockNavigation.addListener.mock.calls[0][1]();
    });
    await act(async () =>
      onTradeStateChange({ status: 'complete', transactionId }),
    );

    expect(hook.result.current.isBusy).toBe(false);
    expect(detachQuickBuyTradeStateCallback).toHaveBeenCalledWith(
      transactionId,
    );
    expect(showErrorToast).toHaveBeenCalledWith(
      strings('gacha.funding.auto_open_cancelled'),
    );
    expect(mockGeneratePack).not.toHaveBeenCalled();
    expect(hook.onPurchased).not.toHaveBeenCalled();
  });

  it('does not open a new intent while Gacha home is covered', () => {
    const hook = renderFunding();
    act(() => {
      hook.options.isFocused = false;
      hook.rerender(undefined);
    });

    act(() => hook.result.current.open(createPack()));

    expect(hook.result.current.quickBuy).toBeUndefined();
    expect(hook.result.current.isBusy).toBe(false);
  });

  it('tells the user when an account switch cancels automatic opening', () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => onTradeStateChange({ status: 'submitting' }));

    act(() => {
      hook.options.account = { ...MOCK_ACCOUNT, id: 'different-account' };
      hook.rerender(undefined);
    });
    act(() => hook.rerender(undefined));

    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.result.current.error).toBe(
      strings('gacha.funding.auto_open_cancelled'),
    );
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('shows a toast when leaving Gacha cancels automatic opening', () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => onTradeStateChange({ status: 'submitting' }));

    act(() => hook.unmount());

    expect(showErrorToast).toHaveBeenCalledTimes(1);
    expect(showErrorToast).toHaveBeenCalledWith(
      strings('gacha.funding.auto_open_cancelled'),
    );
  });

  it.each([
    {
      reason: 'an explicit cancel',
      revoke: (hook: ReturnType<typeof renderFunding>) =>
        hook.result.current.cancel(),
      submitted: true,
      pack: createPack(),
    },
    {
      reason: 'an account switch before submission',
      revoke: (hook: ReturnType<typeof renderFunding>) => {
        hook.options.account = { ...MOCK_ACCOUNT, id: 'different-account' };
        hook.rerender(undefined);
      },
      submitted: false,
      pack: createPack(),
    },
    {
      reason: 'leaving Gacha during a balance-only top-up',
      revoke: (hook: ReturnType<typeof renderFunding>) => hook.unmount(),
      submitted: true,
      pack: undefined,
    },
  ])(
    'does not report a cancelled opening after $reason',
    ({ revoke, submitted, pack }) => {
      const hook = renderFunding();
      act(() => hook.result.current.open(pack));
      if (submitted) {
        act(() =>
          hook.result.current.quickBuy?.onTradeStateChange?.({
            status: 'submitting',
          }),
        );
      }

      act(() => revoke(hook));

      expect(showErrorToast).not.toHaveBeenCalled();
      expect(hook.result.current.error).toBeUndefined();
    },
  );

  it('checks the current Redux account before React rerenders', async () => {
    const hook = renderFunding();
    const balanceRequest = deferred<bigint>();
    hook.refresh.mockReturnValue(balanceRequest.promise);
    const onTradeStateChange = openFunding(hook);
    act(() => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    mockAccountByScope.mockReturnValue({
      ...MOCK_INTERNAL_ACCOUNT,
      id: 'other-account',
    });
    await act(async () => balanceRequest.resolve(50_000_000n));

    expect(mockGeneratePack).not.toHaveBeenCalled();
    expect(hook.onPurchased).not.toHaveBeenCalled();
  });

  it.each(['leaving Gacha', 'account switch'] as const)(
    'discards an unsigned pack prepared after %s',
    async (reason) => {
      const hook = renderFunding();
      const preparation = deferred<string>();
      mockGeneratePack.mockReturnValue(preparation.promise);
      const onTradeStateChange = openFunding(hook);
      await act(async () => {
        onTradeStateChange({ status: 'submitting' });
        onTradeStateChange({ status: 'complete', transactionId });
      });
      expect(hook.result.current.phase).toBe('purchasing');

      act(() => {
        if (reason === 'leaving Gacha') {
          hook.unmount();
        } else {
          hook.options.account = { ...MOCK_ACCOUNT, id: 'different-account' };
          mockAccountByScope.mockReturnValue({
            ...MOCK_INTERNAL_ACCOUNT,
            id: 'different-account',
          });
          hook.rerender(undefined);
        }
      });
      await act(async () => preparation.resolve('abandoned-pack-memo'));

      expect(mockDismissOperation).toHaveBeenCalledTimes(1);
      expect(mockDismissOperation).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        memo: 'abandoned-pack-memo',
      });
      expect(hook.onPurchased).not.toHaveBeenCalled();
    },
  );

  it('releases the tracked trade callback when cancelling after submission', () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'submitted', transactionId });
    });

    act(() => hook.result.current.cancel());

    expect(detachQuickBuyTradeStateCallback).toHaveBeenCalledWith(
      transactionId,
    );
    expect(hook.result.current.isBusy).toBe(false);
  });

  it('releases the callback when submission finishes after cancellation', () => {
    const hook = renderFunding();
    const onTradeStateChange = openFunding(hook);
    act(() => {
      onTradeStateChange({ status: 'submitting' });
      hook.result.current.cancel();
    });

    act(() => onTradeStateChange({ status: 'submitted', transactionId }));

    expect(detachQuickBuyTradeStateCallback).toHaveBeenCalledWith(
      transactionId,
    );
    expect(hook.result.current.isBusy).toBe(false);
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it('clears the balance retry and deadline when checking is cancelled', async () => {
    const hook = renderFunding();
    hook.refresh.mockResolvedValue(49_999_999n);
    const onTradeStateChange = openFunding(hook);
    const initialTimerCount = jest.getTimerCount();
    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });

    act(() => {
      hook.result.current.cancel();
      jest.runAllTicks();
    });

    expect(jest.getTimerCount()).toBe(initialTimerCount);
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.refresh).toHaveBeenCalledTimes(1);
    expect(mockGeneratePack).not.toHaveBeenCalled();
  });

  it('ignores a cancelled intent after a new funding session starts', async () => {
    const hook = renderFunding();
    const previousCallback = openFunding(hook);
    act(() => hook.result.current.cancel());
    const currentCallback = openFunding(
      hook,
      createPack({ code: 'pokemon_25', price: 25 }),
    );

    await act(async () => {
      previousCallback({ status: 'submitting' });
      previousCallback({ status: 'complete', transactionId: 'old-trade' });
      currentCallback({ status: 'submitting' });
      currentCallback({ status: 'complete', transactionId });
    });

    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
    expect(mockGeneratePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: { code: 'pokemon_25', name: 'Elite Pokemon Pack', price: 25 },
    });
  });

  it('refreshes a balance-only top-up without purchasing a pack', async () => {
    const hook = renderFunding();
    act(() => hook.result.current.open());
    const funding = hook.result.current.quickBuy;
    expect(funding?.initialAmountUsd).toBeUndefined();

    await act(async () => {
      funding?.onTradeStateChange?.({ status: 'submitting' });
      hook.result.current.closeQuickBuy();
      funding?.onTradeStateChange?.({ status: 'complete', transactionId });
    });

    expect(hook.refresh).toHaveBeenCalledTimes(1);
    expect(mockGeneratePack).not.toHaveBeenCalled();
    expect(hook.result.current.isBusy).toBe(false);
  });

  it('reports a purchase failure without retrying the purchase', async () => {
    const hook = renderFunding();
    mockGeneratePack.mockRejectedValue(new Error('provider unavailable'));
    const onTradeStateChange = openFunding(hook);

    await act(async () => {
      onTradeStateChange({ status: 'submitting' });
      onTradeStateChange({ status: 'complete', transactionId });
    });
    await act(async () =>
      onTradeStateChange({ status: 'complete', transactionId }),
    );

    expect(mockGeneratePack).toHaveBeenCalledTimes(1);
    expect(hook.result.current.error).toBe(strings('gacha.errors.unknown'));
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.onPurchased).not.toHaveBeenCalled();
  });
});
