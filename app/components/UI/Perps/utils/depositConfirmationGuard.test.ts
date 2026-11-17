import Routes from '../../../../constants/navigation/Routes';
import {
  createDepositConfirmationGuard,
  createDepositPrepSession,
  getFocusedRouteName,
  isRedesignedConfirmationFocused,
  type NestedNavigationState,
} from './depositConfirmationGuard';

const CONFIRMATION_ROUTE =
  Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;

const createState = (
  focusedName: string,
  nested?: NestedNavigationState,
): NestedNavigationState => ({
  index: 1,
  routes: [
    { name: Routes.PERPS.PERPS_HOME },
    { name: focusedName, ...(nested ? { state: nested } : {}) },
  ],
});

const createNavigation = (initialState: NestedNavigationState) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: jest.fn(() => state),
    goBack: jest.fn(),
    addListener: jest.fn((_event: 'state', callback: () => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    }),
    emitState: (nextState: NestedNavigationState) => {
      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
};

describe('getFocusedRouteName', () => {
  it('returns undefined for empty state', () => {
    expect(getFocusedRouteName(undefined)).toBeUndefined();
    expect(getFocusedRouteName({ index: 0, routes: [] })).toBeUndefined();
  });

  it('returns the focused leaf route name from nested stacks', () => {
    const state = createState(Routes.PERPS.ROOT, {
      index: 0,
      routes: [{ name: CONFIRMATION_ROUTE }],
    });

    expect(getFocusedRouteName(state)).toBe(CONFIRMATION_ROUTE);
  });
});

describe('isRedesignedConfirmationFocused', () => {
  it('returns true when a confirmation route is focused', () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));

    expect(isRedesignedConfirmationFocused(navigation)).toBe(true);
  });

  it('returns false when Perps is focused', () => {
    const navigation = createNavigation(
      createState(Routes.PERPS.MARKET_DETAILS),
    );

    expect(isRedesignedConfirmationFocused(navigation)).toBe(false);
  });
});

describe('createDepositConfirmationGuard', () => {
  it('goes back when deposit fails while confirmation is focused', () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const guard = createDepositConfirmationGuard(navigation);

    guard.onDepositFailed();

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('does not go back when the user already left confirmation', () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const guard = createDepositConfirmationGuard(navigation);

    navigation.emitState(createState(Routes.PERPS.MARKET_DETAILS));
    guard.onDepositFailed();

    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('goes back once confirmation appears after deferred navigation', () => {
    const navigation = createNavigation(
      createState(Routes.PERPS.MARKET_DETAILS),
    );
    const guard = createDepositConfirmationGuard(navigation);

    guard.onDepositFailed();
    expect(navigation.goBack).not.toHaveBeenCalled();

    navigation.emitState(createState(CONFIRMATION_ROUTE));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('does not go back for a later confirmation after the original loses focus', () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const guard = createDepositConfirmationGuard(navigation);

    navigation.emitState(createState(Routes.PERPS.MARKET_DETAILS));
    navigation.emitState(createState(CONFIRMATION_ROUTE));
    guard.onDepositFailed();

    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('does not go back for a later confirmation after cancel', () => {
    const navigation = createNavigation(
      createState(Routes.PERPS.MARKET_DETAILS),
    );
    const guard = createDepositConfirmationGuard(navigation);

    guard.onDepositFailed();
    guard.cancel();
    navigation.emitState(createState(CONFIRMATION_ROUTE));

    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('keeps watching when Pay With opens on top of confirmation', () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const guard = createDepositConfirmationGuard(navigation);

    navigation.emitState(
      createState(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET),
    );
    guard.onDepositFailed();

    expect(navigation.goBack).toHaveBeenCalledTimes(2);
  });

  it('dismisses Pay With and confirmation when prep fails while the sheet is focused', () => {
    const navigation = createNavigation(
      createState(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET),
    );
    const guard = createDepositConfirmationGuard(navigation);

    guard.onDepositFailed();

    expect(navigation.goBack).toHaveBeenCalledTimes(2);
  });
});

describe('createDepositPrepSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs deposit prep once when scheduled twice before the timeout fires', async () => {
    const session = createDepositPrepSession();
    const firstRun = jest.fn().mockResolvedValue(undefined);
    const secondRun = jest.fn().mockResolvedValue(undefined);
    const firstSuccess = jest.fn();
    const secondSuccess = jest.fn();

    session.ensureScheduled(firstRun, {
      onSuccess: firstSuccess,
      onFailure: jest.fn(),
    });
    session.ensureScheduled(secondRun, {
      onSuccess: secondSuccess,
      onFailure: jest.fn(),
    });

    await jest.runAllTimersAsync();

    expect(firstRun).toHaveBeenCalledTimes(1);
    expect(secondRun).not.toHaveBeenCalled();
    expect(firstSuccess).not.toHaveBeenCalled();
    expect(secondSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not start a second prep while the first is in flight', async () => {
    const session = createDepositPrepSession();
    let resolveFirst: () => void = () => undefined;
    const firstRun = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const secondRun = jest.fn().mockResolvedValue(undefined);

    session.ensureScheduled(firstRun, {
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    });
    await jest.runAllTimersAsync();

    session.ensureScheduled(secondRun, {
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    });
    await jest.runAllTimersAsync();
    resolveFirst();
    await Promise.resolve();

    expect(firstRun).toHaveBeenCalledTimes(1);
    expect(secondRun).not.toHaveBeenCalled();
  });

  it('dismisses the latest attached confirmation when a superseded tap fails', async () => {
    const firstNavigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const secondNavigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const session = createDepositPrepSession();
    let rejectFirst: (error: Error) => void = () => undefined;
    const firstRun = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );

    session.attachGuard(createDepositConfirmationGuard(firstNavigation));
    session.ensureScheduled(firstRun, {
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    });
    await jest.runAllTimersAsync();

    session.attachGuard(createDepositConfirmationGuard(secondNavigation));
    session.ensureScheduled(jest.fn().mockResolvedValue(undefined), {
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    });

    rejectFirst(new Error('stale prep failed'));
    await Promise.resolve();
    await Promise.resolve();

    expect(firstNavigation.goBack).not.toHaveBeenCalled();
    expect(secondNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('does not run prep or settle after dispose', async () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const session = createDepositPrepSession();
    const run = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const onFailure = jest.fn();

    session.attachGuard(createDepositConfirmationGuard(navigation));
    session.ensureScheduled(run, { onSuccess, onFailure });
    session.dispose();
    await jest.runAllTimersAsync();

    expect(run).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('ignores in-flight settlement after dispose', async () => {
    const navigation = createNavigation(createState(CONFIRMATION_ROUTE));
    const session = createDepositPrepSession();
    let rejectRun: (error: Error) => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRun = reject;
        }),
    );
    const onFailure = jest.fn();

    session.attachGuard(createDepositConfirmationGuard(navigation));
    session.ensureScheduled(run, { onSuccess: jest.fn(), onFailure });
    await jest.runAllTimersAsync();
    session.dispose();
    rejectRun(new Error('prep failed after unmount'));
    await Promise.resolve();
    await Promise.resolve();

    expect(onFailure).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('cancels a waiting dismiss listener on dispose after prep fails', async () => {
    const navigation = createNavigation(
      createState(Routes.PERPS.MARKET_DETAILS),
    );
    const session = createDepositPrepSession();
    let rejectRun: (error: Error) => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRun = reject;
        }),
    );

    session.attachGuard(createDepositConfirmationGuard(navigation));
    session.ensureScheduled(run, {
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    });
    await jest.runAllTimersAsync();
    rejectRun(new Error('prep failed'));
    await Promise.resolve();
    await Promise.resolve();

    session.dispose();
    navigation.emitState(createState(CONFIRMATION_ROUTE));

    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
