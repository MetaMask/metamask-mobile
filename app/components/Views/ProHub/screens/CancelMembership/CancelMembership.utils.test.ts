import type { NavigationState } from '@react-navigation/native';
import {
  CANCELLATION_REASONS,
  CANCEL_TYPES,
} from '@metamask/subscription-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { CANCEL_REASONS, OTHER_REASON_ID } from './CancelMembership.constants';
import {
  CANCELLATION_TIMINGS,
  POST_CANCELLATION_PRO_HUB_SOURCE,
  buildPostCancellationResetState,
  formatCancellationEndDate,
  getCancellationTiming,
  shuffleCancelReasons,
  toCancellationReason,
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

    expect(result[result.length - 1]?.id).toBe(OTHER_REASON_ID);
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
      CANCELLATION_REASONS.NOT_USING_BENEFITS,
      CANCELLATION_REASONS.BENEFITS_NOT_AS_EXPECTED,
      CANCELLATION_REASONS.SOMETHING_DID_NOT_WORK,
      CANCELLATION_REASONS.UNHAPPY_WITH_SUPPORT,
      CANCELLATION_REASONS.TOO_EXPENSIVE,
      CANCELLATION_REASONS.OTHER,
    ]);
  });
});

describe('toCancellationReason', () => {
  it('returns undefined when no reason is selected', () => {
    expect(toCancellationReason(null)).toBeUndefined();
  });

  it('returns undefined for an unknown survey id', () => {
    expect(toCancellationReason('cost')).toBeUndefined();
  });

  it.each(Object.values(CANCELLATION_REASONS))(
    'returns the published reason code %s',
    (reason) => {
      expect(toCancellationReason(reason)).toBe(reason);
    },
  );
});

describe('getCancellationTiming', () => {
  it('maps immediate cancellation', () => {
    expect(getCancellationTiming(CANCEL_TYPES.ALLOWED_IMMEDIATE)).toBe(
      CANCELLATION_TIMINGS.IMMEDIATE,
    );
  });

  it('maps period-end cancellation', () => {
    expect(getCancellationTiming(CANCEL_TYPES.ALLOWED_AT_PERIOD_END)).toBe(
      CANCELLATION_TIMINGS.PERIOD_END,
    );
  });

  it.each([
    CANCEL_TYPES.NOT_ALLOWED,
    CANCEL_TYPES.NOT_ALLOWED_PENDING_VERIFICATION,
  ])('returns undefined when cancellation type is %s', (cancelType) => {
    expect(getCancellationTiming(cancelType)).toBeUndefined();
  });
});

describe('formatCancellationEndDate', () => {
  it('formats an ISO period end for confirmation copy', () => {
    const periodEnd = '2027-07-20T12:00:00.000Z';

    expect(formatCancellationEndDate(periodEnd)).toBe(
      new Date(periodEnd).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    );
  });

  it('returns the original value when the date is invalid', () => {
    expect(formatCancellationEndDate('invalid-date')).toBe('invalid-date');
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

  it('returns directly to the origin after immediate cancellation', () => {
    const state = createStackState([
      'Money',
      Routes.PRO_HUB.ROOT,
      Routes.PRO_HUB.CANCEL_MEMBERSHIP,
    ]);

    const nextState = buildPostCancellationResetState(state, false);

    expect(nextState.index).toBe(0);
    expect(nextState.routes).toEqual([{ key: 'Money-0', name: 'Money' }]);
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
      index: 1,
      routes: [{ name: Routes.WALLET.HOME }, { name: Routes.MONEY.HOME }],
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
