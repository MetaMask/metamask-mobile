import { Alert } from 'react-native';
import type {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import configureStore from '../../../util/test/configureStore';
import { initialStateDeeplinks } from '../../../../tests/component-view/presets/deeplinks';
import { installDeeplinkCaseBoundary } from '../../../../tests/component-view/api-mocking/deeplinkSwapToken';
import Engine from '../../Engine';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import type { DeeplinkManager } from '../DeeplinkManager';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';
import {
  DEEPLINK_URI_CASES,
  NON_NAVIGATION_CASES,
  ORIGIN_EXTERNAL_DEEPLINK,
} from '../__fixtures__/deeplinkUriCases';
import { splitVolatileParams } from '../__fixtures__/splitVolatileParams';
import parseDeeplink from './parseDeeplink';

/**
 * Real-URI contract for the deeplink parser in resolve mode.
 *
 * Real: parseDeeplink, extractURLParams, handleUniversalLink (signature and
 * interstitial policy included), the intent builders and their validation.
 * Boundary mocks only: Engine, native/SDK modules and analytics/tracing
 * transport (the shared unit setup), plus Branch referring params below.
 * Expected outcomes come from `__fixtures__/deeplinkUriCases.ts`, authored
 * independently of the implementation. The isolated parser suite in
 * `parseDeeplink.test.ts` is kept for dispatch-level behavior.
 *
 * Navigation and prepare effects are asserted in
 * `DeeplinkManager.navigation.view.test.tsx`.
 */

jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn().mockResolvedValue({}),
}));

// The universal-link path only touches the manager for legacy actions
// (send/wc) that are outside this suite.
const deeplinkManager = {} as unknown as DeeplinkManager;

describe('parseDeeplink resolve contract (real URIs)', () => {
  const navigate = jest.fn();
  const reset = jest.fn();

  const bindStore = (state: Parameters<typeof initialStateDeeplinks>[0]) => {
    const store = configureStore(initialStateDeeplinks(state));
    ReduxService.store = store;
    return store;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    NavigationService.navigation = {
      navigate,
      reset,
    } as unknown as NavigationContainerRef<ParamListBase>;
  });

  afterEach(() => {
    NavigationService.resetForTesting();
    jest.restoreAllMocks();
  });

  describe.each(DEEPLINK_URI_CASES.map((testCase) => [testCase.id, testCase]))(
    '%s',
    (_id, testCase) => {
      it(`resolves to the expected intent [${testCase.state} state]`, async () => {
        const store = bindStore(testCase.state);
        const stateBefore = store.getState();
        const teardownBoundary = installDeeplinkCaseBoundary(
          testCase.boundary,
          Engine as never,
        );

        let result: Awaited<ReturnType<typeof parseDeeplink>>;
        try {
          result = await parseDeeplink({
            deeplinkManager,
            url: testCase.url,
            origin: testCase.origin,
            mode: 'resolve',
          });
        } finally {
          teardownBoundary();
        }

        const intent = result as DeeplinkIntent;
        expect(intent).toEqual(
          expect.objectContaining({ target: expect.any(Object) }),
        );
        const { target, hasPrepare, volatile } = testCase.expected;
        expect(intent.target.type).toBe(target.type);
        expect(intent.target.routeName).toBe(target.routeName);
        expect(
          'backTab' in intent.target ? intent.target.backTab : undefined,
        ).toBe(target.backTab);
        const { stable, violations } = splitVolatileParams(
          intent.target.params,
          volatile,
        );
        expect(violations).toEqual([]);
        expect(stable).toEqual(target.params);
        expect(typeof intent.prepare === 'function').toBe(hasPrepare);

        // Resolve must not navigate or apply deferred prepare effects.
        expect(navigate).not.toHaveBeenCalled();
        expect(reset).not.toHaveBeenCalled();
        expect(store.getState()).toBe(stateBefore);
      });
    },
  );

  describe.each(
    NON_NAVIGATION_CASES.map((testCase) => [testCase.id, testCase]),
  )('non-navigation: %s', (_id, testCase) => {
    it('resolves to false without navigating', async () => {
      bindStore('baseline');
      const alertSpy = jest
        .spyOn(Alert, 'alert')
        .mockImplementation(() => undefined);

      const result = await parseDeeplink({
        deeplinkManager,
        url: testCase.url,
        origin: ORIGIN_EXTERNAL_DEEPLINK,
        mode: 'resolve',
      });

      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(testCase.alerts ? 1 : 0);
      expect(navigate).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
    });
  });
});
