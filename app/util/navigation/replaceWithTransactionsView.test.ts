import { StackActions } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import {
  replaceWithTransactionsView,
  showActivityKeepingFlow,
} from './replaceWithTransactionsView';

interface FakeNav {
  navigate: jest.Mock;
  dispatch: jest.Mock;
  getState: jest.Mock;
  getParent: jest.Mock;
}

const makeNav = ({
  state,
  parent,
}: {
  state?: { type?: string; routeNames?: string[] };
  parent?: FakeNav;
} = {}): FakeNav => ({
  navigate: jest.fn(),
  dispatch: jest.fn(),
  getState: jest.fn(() => state),
  getParent: jest.fn(() => parent),
});

describe('replaceWithTransactionsView', () => {
  it('replaces the current route when the navigator itself owns TRANSACTIONS_VIEW (redesigned confirmations)', () => {
    const nav = makeNav({
      state: {
        type: 'stack',
        routeNames: ['Confirmation', Routes.TRANSACTIONS_VIEW],
      },
    });

    replaceWithTransactionsView(nav);

    expect(nav.dispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.TRANSACTIONS_VIEW),
    );
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('replaces on the parent navigator that owns TRANSACTIONS_VIEW (stake/earn nested stack)', () => {
    const parent = makeNav({
      state: {
        type: 'stack',
        routeNames: ['Home', 'StakeScreens', Routes.TRANSACTIONS_VIEW],
      },
    });
    const child = makeNav({
      state: { type: 'stack', routeNames: ['Stake', 'Unstake'] },
      parent,
    });

    replaceWithTransactionsView(child);

    expect(child.dispatch).not.toHaveBeenCalled();
    expect(parent.dispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.TRANSACTIONS_VIEW),
    );
  });

  it('skips a tab navigator that lists TRANSACTIONS_VIEW and replaces on the owning stack above it', () => {
    const parent = makeNav({
      state: {
        type: 'stack',
        routeNames: ['Home', Routes.TRANSACTIONS_VIEW],
      },
    });
    const tab = makeNav({
      state: { type: 'tab', routeNames: [Routes.TRANSACTIONS_VIEW] },
      parent,
    });

    replaceWithTransactionsView(tab);

    expect(tab.dispatch).not.toHaveBeenCalled();
    expect(parent.dispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.TRANSACTIONS_VIEW),
    );
  });

  it('falls back to navigate when no stack navigator owns TRANSACTIONS_VIEW', () => {
    const nav = makeNav({
      state: { type: 'stack', routeNames: ['SomethingElse'] },
    });

    replaceWithTransactionsView(nav);

    expect(nav.dispatch).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });
});

describe('showActivityKeepingFlow', () => {
  it('pushes Activity without popping for a combined input+confirm flow (swaps)', () => {
    const nav = makeNav();

    showActivityKeepingFlow(nav);

    expect(nav.dispatch).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('pops the confirmation to the flow input, then pushes Activity (stake)', () => {
    const nav = makeNav();

    showActivityKeepingFlow(nav, { returnToFlowInput: true });

    expect(nav.dispatch).toHaveBeenCalledWith(StackActions.popToTop());
    expect(nav.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    // pop must happen before the Activity push so back lands on the input.
    expect(nav.dispatch.mock.invocationCallOrder[0]).toBeLessThan(
      nav.navigate.mock.invocationCallOrder[0],
    );
  });
});
