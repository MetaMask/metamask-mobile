import Routes from '../../../../constants/navigation/Routes';
import {
  createDepositConfirmationGuard,
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
});
