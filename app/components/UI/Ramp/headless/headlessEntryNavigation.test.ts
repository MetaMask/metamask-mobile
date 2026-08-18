import Routes from '../../../../constants/navigation/Routes';
import { dismissHeadlessEntryFromRoot } from './headlessEntryNavigation';

/**
 * Builds a root navigation ref whose state mirrors production nesting:
 * HEADLESS_ENTRY lives inside the main navigator, never at the root
 * (App stack -> Main -> ... -> HEADLESS_ENTRY -> nested stack -> HEADLESS_HOST).
 */
function buildRootNav({
  hostFocused,
  hostSessionId,
}: {
  hostFocused: boolean;
  hostSessionId?: string;
}) {
  const goBack = jest.fn();
  const headlessEntryRoute = {
    name: Routes.RAMP.HEADLESS_ENTRY,
    key: 'entry-1',
    state: {
      index: 0,
      routes: [
        {
          name: 'RampTokenSelectionRoot',
          key: 'tsr-1',
          state: {
            index: 0,
            routes: [
              {
                name: Routes.RAMP.HEADLESS_HOST,
                key: 'host-1',
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
  const mainRoutes = [{ name: 'WalletView', key: 'w-1' }, headlessEntryRoute];
  return {
    goBack,
    getState: () => ({
      index: 0,
      routes: [
        {
          name: 'HomeNav',
          key: 'home-1',
          state: {
            index: hostFocused ? 1 : 0,
            routes: mainRoutes,
          },
        },
      ],
    }),
  };
}

describe('dismissHeadlessEntryFromRoot', () => {
  it('pops when the focused leaf is the headless Host for the expected session', () => {
    const nav = buildRootNav({ hostFocused: true, hostSessionId: 'session-1' });

    expect(dismissHeadlessEntryFromRoot(nav, 'session-1')).toBe(true);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('pops when no expected session id is given', () => {
    const nav = buildRootNav({ hostFocused: true });

    expect(dismissHeadlessEntryFromRoot(nav)).toBe(true);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('does nothing when the headless Host is not focused', () => {
    const nav = buildRootNav({
      hostFocused: false,
      hostSessionId: 'session-1',
    });

    expect(dismissHeadlessEntryFromRoot(nav, 'session-1')).toBe(false);
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  it('does not pop an overlay owned by a newer session', () => {
    const nav = buildRootNav({ hostFocused: true, hostSessionId: 'session-2' });

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
