import type { NavigationState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { CANCEL_REASONS } from './CancelMembership.constants';
import {
  POST_CANCELLATION_PRO_HUB_SOURCE,
  buildPostCancellationResetState,
  shuffleCancelReasons,
} from './CancelMembership.utils';

const createStackState = (routeNames: string[]): NavigationState => ({
  key: 'stack',
  index: routeNames.length - 1,
  routeNames,
  routes: routeNames.map((name, i) => ({
    key: `${name}-${i}`,
    name,
  })),
  type: 'stack',
  stale: false,
});

describe('shuffleCancelReasons', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pins other as the last item', () => {
    const result = shuffleCancelReasons(CANCEL_REASONS);

    expect(result[result.length - 1]?.id).toBe('other');
  });

  it('keeps the same reason ids as the input', () => {
    const result = shuffleCancelReasons(CANCEL_REASONS);

    expect(result.map((reason) => reason.id).sort()).toEqual(
      CANCEL_REASONS.map((reason) => reason.id).sort(),
    );
  });

  it('does not mutate the input array', () => {
    const input = [...CANCEL_REASONS];

    shuffleCancelReasons(input);

    expect(input).toEqual(CANCEL_REASONS);
  });

  it('returns a known permutation of non-other reasons when Math.random is 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const result = shuffleCancelReasons(CANCEL_REASONS);

    expect(result.map((reason) => reason.id)).toEqual([
      'not_using',
      'benefit_misfit',
      'didnt_work',
      'support',
      'cost',
      'other',
    ]);
  });

  it('shuffles remaining reasons when other is missing', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const withoutOther = CANCEL_REASONS.filter(
      (reason) => reason.id !== 'other',
    );

    const result = shuffleCancelReasons(withoutOther);

    expect(result.map((reason) => reason.id)).toEqual([
      'not_using',
      'benefit_misfit',
      'didnt_work',
      'support',
      'cost',
    ]);
  });
});

describe('buildPostCancellationResetState', () => {
  it('puts Pro Hub on top of the origin screen and drops cancel and membership', () => {
    const state = createStackState([
      'Home',
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.MEMBERSHIP,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state);

    expect(nextState.index).toBe(1);
    expect(nextState.routes).toEqual([
      { key: 'Home-0', name: 'Home' },
      {
        name: Routes.PRO_HUB.ROOT,
        params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
      },
    ]);
  });

  it('preserves whichever screen started the flow under Pro Hub', () => {
    const state = createStackState([
      'Money',
      Routes.PRO_SUBSCRIPTION.ROOT,
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state);

    expect(nextState.routes).toEqual([
      { key: 'Money-0', name: 'Money' },
      {
        name: Routes.PRO_HUB.ROOT,
        params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
      },
    ]);
  });

  it('drops the Join Pro benefits modal so back from Pro Hub does not open it', () => {
    const state = createStackState([
      'Home',
      Routes.PRO_SUBSCRIPTION.ROOT,
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state);

    expect(
      nextState.routes?.some(
        (route) => route.name === Routes.PRO_SUBSCRIPTION.ROOT,
      ),
    ).toBe(false);
  });

  it('drops Earned and Saved screens so they are not under Pro Hub after cancel', () => {
    const state = createStackState([
      'Home',
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.EARNED,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state);

    expect(
      nextState.routes?.some(
        (route) =>
          route.name === Routes.PRO_HUB.EARNED ||
          route.name === Routes.PRO_HUB.CANCEL_MEMBERSHIP,
      ),
    ).toBe(false);
  });

  it('keeps nested HomeNav tab state so back from Pro Hub returns to Money', () => {
    const homeNavNestedState = {
      index: 0,
      routes: [
        {
          name: Routes.MAIN_FLOW,
          state: {
            index: 1,
            routes: [{ name: Routes.WALLET.HOME }, { name: Routes.MONEY.HOME }],
          },
        },
      ],
    };
    const homeNavParams = { screen: Routes.MONEY.HOME };
    const state: NavigationState = {
      ...createStackState([
        Routes.ONBOARDING.HOME_NAV,
        Routes.PRO_HUB.ROOT,
        Routes.PRO_HUB.CANCEL_MEMBERSHIP,
      ]),
      routes: [
        {
          key: `${Routes.ONBOARDING.HOME_NAV}-0`,
          name: Routes.ONBOARDING.HOME_NAV,
          params: homeNavParams,
          state: homeNavNestedState,
        },
        { key: 'ProHub-1', name: Routes.PRO_HUB.ROOT },
        {
          key: 'ProHubCancelMembership-2',
          name: Routes.PRO_HUB.CANCEL_MEMBERSHIP,
        },
      ],
    };

    const nextState = buildPostCancellationResetState(state);

    expect(nextState.routes?.[0]).toEqual({
      key: `${Routes.ONBOARDING.HOME_NAV}-0`,
      name: Routes.ONBOARDING.HOME_NAV,
      params: homeNavParams,
      state: homeNavNestedState,
    });
  });

  it('inserts HomeNav under Pro Hub when the stack has no non-Pro origin screen', () => {
    const state = createStackState([
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state);

    expect(nextState.index).toBe(1);
    expect(nextState.routes).toEqual([
      { name: Routes.ONBOARDING.HOME_NAV },
      {
        name: Routes.PRO_HUB.ROOT,
        params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
      },
    ]);
  });
});
