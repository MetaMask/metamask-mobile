import Routes from '../../../../constants/navigation/Routes';
import { dismissHeadlessEntryFromRoot } from './headlessEntryNavigation';

/**
 * Builds a root navigation ref whose FOCUSED chain mirrors production:
 * HEADLESS_ENTRY is nested inside the main navigator, never at the root
 * (App stack -> Main -> ... -> HEADLESS_ENTRY -> nested stack -> HEADLESS_HOST).
 */
function buildRootNav({
  focusedIncludesHeadlessEntry,
  hostSessionId,
}: {
  focusedIncludesHeadlessEntry: boolean;
  hostSessionId?: string;
}) {
  const goBack = jest.fn();
  const headlessEntryRoute = {
    name: Routes.RAMP.HEADLESS_ENTRY,
    state: {
      index: 0,
      routes: [
        {
          name: 'RampTokenSelectionRoot',
          state: {
            index: 0,
            routes: [
              {
                name: Routes.RAMP.HEADLESS_HOST,
                params: hostSessionId
                  ? { headlessSessionId: hostSessionId }
                  : {},
              },
            ],
          },
        },
      ],
    },
  };
  const mainRoutes = focusedIncludesHeadlessEntry
    ? [{ name: 'WalletView' }, headlessEntryRoute]
    : [headlessEntryRoute, { name: 'WalletView' }];
  return {
    goBack,
    getState: () => ({
      index: 0,
      routes: [
        {
          name: 'HomeNav',
          state: {
            index: mainRoutes.length - 1,
            routes: mainRoutes,
          },
        },
      ],
    }),
  };
}

describe('dismissHeadlessEntryFromRoot', () => {
  it('pops when HEADLESS_ENTRY is in the nested focused chain', () => {
    const nav = buildRootNav({
      focusedIncludesHeadlessEntry: true,
      hostSessionId: 'session-1',
    });

    expect(dismissHeadlessEntryFromRoot(nav, 'session-1')).toBe(true);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('pops when no expected session id is given', () => {
    const nav = buildRootNav({ focusedIncludesHeadlessEntry: true });

    expect(dismissHeadlessEntryFromRoot(nav)).toBe(true);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('does nothing when HEADLESS_ENTRY is not focused', () => {
    const nav = buildRootNav({
      focusedIncludesHeadlessEntry: false,
      hostSessionId: 'session-1',
    });

    expect(dismissHeadlessEntryFromRoot(nav, 'session-1')).toBe(false);
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  it('does not pop an overlay owned by a newer session', () => {
    const nav = buildRootNav({
      focusedIncludesHeadlessEntry: true,
      hostSessionId: 'session-2',
    });

    expect(dismissHeadlessEntryFromRoot(nav, 'session-1')).toBe(false);
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  it('handles a missing or throwing getState safely', () => {
    expect(dismissHeadlessEntryFromRoot(undefined)).toBe(false);
    expect(
      dismissHeadlessEntryFromRoot({
        getState: () => {
          throw new Error('torn down');
        },
        goBack: jest.fn(),
      }),
    ).toBe(false);
  });
});
