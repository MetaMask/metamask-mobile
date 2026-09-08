import Routes from '../../../constants/navigation/Routes';
import { buildHomeNavResetState, resetToHomeNav } from './resetToHomeNav';

const mockReset = jest.fn();

jest.mock('../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      reset: (...args: unknown[]) => mockReset(...args),
    },
  },
}));

// This file holds the only literal copy of the navigator path a startup
// deeplink has to name. Callers' tests build their expected state with
// buildHomeNavResetState so that flattening changes one assertion, here,
// instead of one per deeplink case.
describe('buildHomeNavResetState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the given state below HomeNav and MainFlow', () => {
    const mainNavigatorState = {
      routes: [{ name: Routes.HOME_TABS }],
    };

    expect(buildHomeNavResetState(mainNavigatorState)).toStrictEqual({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: mainNavigatorState,
              },
            ],
          },
        },
      ],
    });
  });

  it('preserves the focused index and params of the state it is given', () => {
    const result = buildHomeNavResetState({
      index: 1,
      routes: [
        { name: Routes.HOME_TABS },
        { name: Routes.BROWSER.VIEW, params: { newTabUrl: 'https://a.test' } },
      ],
    });

    expect(result.routes[0].state?.routes[0].state).toStrictEqual({
      index: 1,
      routes: [
        { name: Routes.HOME_TABS },
        { name: Routes.BROWSER.VIEW, params: { newTabUrl: 'https://a.test' } },
      ],
    });
  });
});

describe('resetToHomeNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets navigation to the built state', () => {
    const mainNavigatorState = {
      routes: [{ name: Routes.HOME_TABS }],
    };

    resetToHomeNav(mainNavigatorState);

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith(
      buildHomeNavResetState(mainNavigatorState),
    );
  });
});
