import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  act,
  cleanup,
  fireEvent,
  waitFor,
  within,
  type RenderAPI,
} from '@testing-library/react-native';
import { AppState, Modal, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import type { Store } from 'redux';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import QuickCrypto from 'react-native-quick-crypto';
import { STORAGE_TYPE } from 'react-native-keychain';
import Engine from '../../../../../core/Engine';
import SecureKeychain from '../../../../../core/SecureKeychain';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { PREDICT_NEXT_VERIFIED_CARD_DISMISSED } from '../../../../../constants/storage';
import { strings } from '../../../../../../locales/i18n';
import {
  configurePredictNextFeeds,
  messengerCall,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import {
  configurePredictNextOnboarding,
  configurePredictNextOnboardingDeferred,
  resetPredictNextOnboarding,
} from '../../../../../../tests/component-view/api-mocking/predictNextOnboarding';
import {
  PREDICT_NEXT_CANONICAL_PROFILE_ID,
  PREDICT_NEXT_ENTROPY_SOURCE_ID,
} from '../../../../../../tests/component-view/presets/predictNext';
import { createP256DeviceKey } from '../../auth/p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../auth/venueAuthProfiles';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import { PredictError, PredictErrorCode } from '../../errors';
import { portfolioQueryFamilies } from '../../queries/portfolioQueries';
import { KalshiDemoOnboardingTestIds as SetupIds } from '../../onboarding/internal/KalshiDemoOnboarding.testIds';
import { PredictHomeTestIds as HomeIds } from './PredictHome.testIds';

const nodeCrypto = jest.requireActual<{
  webcrypto: { subtle: typeof QuickCrypto.subtle };
  createHash: typeof QuickCrypto.createHash;
  randomBytes: typeof QuickCrypto.randomBytes;
}>('crypto');
const nativeNetwork = NetInfo as unknown as typeof NetInfoMock;
const deviceKey = createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey);
const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;
const originalAppState = AppState.currentState;
const preferenceKey = `${PREDICT_NEXT_VERIFIED_CARD_DISMISSED}:${PREDICT_NEXT_CANONICAL_PROFILE_ID}`;
const wifi = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: {},
};
const flush = async (): Promise<void> =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
type View = RenderAPI;
interface OnboardingRequest {
  method: string;
  body: unknown;
  url: string;
}
interface Fixture {
  requests: OnboardingRequest[];
}
const gets = (fixture: Fixture): OnboardingRequest[] =>
  fixture.requests.filter(({ method }) => method === 'GET');
const posts = (fixture: Fixture): OnboardingRequest[] =>
  fixture.requests.filter(({ method }) => method === 'POST');
const actionLabel = (group: string): string =>
  `${strings(`predict_next.account_readiness.${group}.title`)}. ${strings(`predict_next.account_readiness.${group}.body`)} ${strings(`predict_next.account_readiness.${group}.action`)}.`;
const renderHome = (
  options: Parameters<typeof renderPredictNext>[1] = {},
): View & { store: Store<RootState> } =>
  renderPredictNext(false, { ...options, onboardingGate: true });
const expectNoSetup = (view: View): void =>
  expect(view.queryByTestId(SetupIds.SHEET)).not.toBeOnTheScreen();

// Patch the native crypto implementation, not the onboarding client or signer.
// The default CV native stub cannot generate or sign P-256 keys.
const cryptoTargets = [
  [
    QuickCrypto.subtle,
    'generateKey',
    nodeCrypto.webcrypto.subtle.generateKey.bind(nodeCrypto.webcrypto.subtle),
  ],
  [
    QuickCrypto.subtle,
    'sign',
    nodeCrypto.webcrypto.subtle.sign.bind(nodeCrypto.webcrypto.subtle),
  ],
  [
    QuickCrypto.subtle,
    'importKey',
    nodeCrypto.webcrypto.subtle.importKey.bind(nodeCrypto.webcrypto.subtle),
  ],
  [
    QuickCrypto.subtle,
    'exportKey',
    nodeCrypto.webcrypto.subtle.exportKey.bind(nodeCrypto.webcrypto.subtle),
  ],
  [QuickCrypto, 'createHash', nodeCrypto.createHash],
  [QuickCrypto, 'randomBytes', nodeCrypto.randomBytes],
] as const;
const originalCrypto = cryptoTargets.map(([target, key]) =>
  Object.getOwnPropertyDescriptor(target, key),
);

beforeAll(() => {
  cryptoTargets.forEach(([target, key, value]) =>
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value,
    }),
  );
});
afterAll(() => {
  cryptoTargets.forEach(([target, key], index) => {
    const original = originalCrypto[index];
    if (original) {
      Object.defineProperty(target, key, original);
    } else {
      Reflect.deleteProperty(target, key);
    }
  });
});

describeForPlatforms('PredictHome account readiness', ({ os }) => {
  let appStateListeners: Set<(state: AppStateStatus) => void>;
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    messengerCall.mockReset();
    invalidateQueries.mockReset().mockResolvedValue(undefined);
    Object.assign(Engine.context.PredictPortfolioService, {
      invalidateQueries,
    });
    appStateListeners = new Set();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListeners.add(listener);
        return {
          remove: (): void => {
            appStateListeners.delete(listener);
          },
        };
      });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    nativeNetwork.__setMockNetInfo(wifi);
    let saved: string | null = null;
    jest
      .spyOn(SecureKeychain, 'getSecureItem')
      .mockImplementation(async () =>
        saved === null ? null : { key: 'device-key', value: saved },
      );
    jest
      .spyOn(SecureKeychain, 'setSecureItem')
      .mockImplementation(async (_key, value) => {
        saved = value;
        return { service: 'device-key', storage: STORAGE_TYPE.AES_GCM_NO_AUTH };
      });
    jest.spyOn(SecureKeychain, 'clearSecureScope').mockResolvedValue(true);
    deviceKey.clear();
    const material = await deviceKey.ensure(true);
    if (!material) {
      throw new Error('P-256 device material was not installed');
    }
    configurePredictNextFeeds();
    const defaultCall = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((action: string, ...params: unknown[]) => {
      if (action === 'PredictDeviceAuthService:getA2t') {
        return Promise.resolve('component-view-a2t');
      }
      if (action === 'PredictDeviceAuthService:ensureDeviceKey') {
        return Promise.resolve(material);
      }
      return defaultCall?.(action, ...params);
    });
    await StorageWrapper.removeItem(preferenceKey);
  });

  afterEach(async () => {
    engine.state = originalEngineState;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: originalAppState,
    });
    cleanup();
    resetPredictNextOnboarding();
    deviceKey.clear();
    nativeNetwork.__resetMockNetInfo();
    await StorageWrapper.removeItem(preferenceKey);
    jest.restoreAllMocks();
  });

  const inactiveIdentityCases: [string, DeepPartial<RootState>][] = [
    [
      'no canonical identity',
      {
        engine: {
          backgroundState: {
            AuthenticationController: {
              srpSessionData: {
                [PREDICT_NEXT_ENTROPY_SOURCE_ID]: {
                  profile: { canonicalProfileId: '' },
                },
              },
            },
          },
        },
      },
    ],
    [
      'signed out',
      {
        engine: {
          backgroundState: { AuthenticationController: { isSignedIn: false } },
        },
      },
    ],
    [
      'locked',
      {
        engine: {
          backgroundState: { KeyringController: { isUnlocked: false } },
        },
      },
    ],
  ];

  it.each(inactiveIdentityCases)(
    'does not read or mount setup when %s',
    async (_name, overrides) => {
      const fixture = configurePredictNextOnboarding();
      const view = renderHome({ overrides });

      await view.findByTestId(HomeIds.BALANCE_AMOUNT);
      await flush();

      expect(gets(fixture)).toHaveLength(0);
      expect(posts(fixture)).toHaveLength(0);
      expect(
        view.queryByTestId(HomeIds.ACCOUNT_READINESS),
      ).not.toBeOnTheScreen();
      expectNoSetup(view);
    },
  );

  it('reads none and offers Get started without opening or writing', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'none' },
    });
    const view = renderHome();

    await view.findByTestId(HomeIds.GET_STARTED_BANNER);

    const card = within(view.getByTestId(HomeIds.GET_STARTED_BANNER));
    expect(
      card.getByText(strings('predict_next.get_started_banner.title')),
    ).toBeOnTheScreen();
    expect(
      card.getByText(strings('predict_next.get_started_banner.body')),
    ).toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(1);
    expect(posts(fixture)).toHaveLength(0);
    expectNoSetup(view);
  });

  it('resumes link_pending from the whole card without a visible CTA or close', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'link_pending' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.FINISH_VERIFYING_BANNER);
    const card = within(view.getByTestId(HomeIds.FINISH_VERIFYING_BANNER));
    expect(
      view.getByRole('button', { name: actionLabel('finish_verifying') }),
    ).toBeOnTheScreen();
    expect(
      card.queryByText(
        strings('predict_next.account_readiness.finish_verifying.action'),
      ),
    ).not.toBeOnTheScreen();
    expect(card.queryAllByRole('button')).toHaveLength(1);
    expect(
      card.queryByTestId(HomeIds.IDENTITY_VERIFIED_DISMISS),
    ).not.toBeOnTheScreen();

    fireEvent.press(view.getByTestId(HomeIds.FINISH_VERIFYING_BANNER));

    await view.findByTestId(SetupIds.EMAIL_INPUT);
    expect(gets(fixture)).toHaveLength(2);
    expect(posts(fixture)).toHaveLength(0);
  });

  it('keeps kyc_pending passive until the user resumes verification', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'kyc_pending' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.FINISH_VERIFYING_BANNER);
    expect(posts(fixture)).toHaveLength(0);
    expectNoSetup(view);

    fireEvent.press(view.getByTestId(HomeIds.FINISH_VERIFYING_BANNER));

    await view.findByTestId(SetupIds.WORKING);
    await waitFor(() =>
      expect(posts(fixture).map(({ url }) => new URL(url).pathname)).toEqual([
        '/v1/venues/kalshi/onboarding/demo-kyc',
      ]),
    );
  });

  it('retry intent reads kyc_pending without posting demo KYC', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'unsupported' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER);
    fixture.setStatus({ state: 'kyc_pending' });

    fireEvent.press(
      view.getByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER),
    );

    await view.findByTestId(SetupIds.WORKING);
    expect(gets(fixture)).toHaveLength(2);
    expect(posts(fixture)).toHaveLength(0);
  });

  it('keeps review noninteractive and reads approval after foreground', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'kyc_review' },
    });
    // Install before the observation captures Date.now as its clock function.
    const now = jest.spyOn(Date, 'now');
    const view = renderHome();
    await view.findByTestId(HomeIds.VERIFICATION_PENDING_BANNER);
    const card = within(view.getByTestId(HomeIds.VERIFICATION_PENDING_BANNER));
    expect(
      card.getByText(strings('predict_next.account_readiness.verifying.title')),
    ).toBeOnTheScreen();
    expect(
      card.getByText(strings('predict_next.account_readiness.verifying.body')),
    ).toBeOnTheScreen();
    expect(card.queryAllByRole('button')).toHaveLength(0);
    expect(
      view.getByTestId(HomeIds.VERIFICATION_PENDING_BANNER).props.onPress,
    ).toBeUndefined();
    const later = Date.now() + 6000;
    await act(async () => {
      appStateListeners.forEach((listener) => listener('background'));
    });
    fixture.setStatus({ state: 'approved' });
    now.mockReturnValue(later);

    await act(async () => {
      appStateListeners.forEach((listener) => listener('active'));
    });

    await view.findByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER);
    expect(
      view.queryByTestId(HomeIds.VERIFICATION_PENDING_BANNER),
    ).not.toBeOnTheScreen();
    expect(
      view.getByRole('button', { name: actionLabel('activation_required') }),
    ).toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(2);
    expect(posts(fixture)).toHaveLength(0);
    expectNoSetup(view);
  });

  it('activates the approved account and closes with one passive read', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'approved' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER);
    expect(
      view.getByRole('button', { name: actionLabel('activation_required') }),
    ).toBeOnTheScreen();
    expect(
      within(
        view.getByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER),
      ).queryByText(
        strings('predict_next.account_readiness.activation_required.action'),
      ),
    ).not.toBeOnTheScreen();
    expect(posts(fixture)).toHaveLength(0);
    fireEvent.press(
      view.getByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER),
    );
    await view.findByTestId(SetupIds.ACTIVATE);
    fixture.setStatus({ state: 'active' });

    fireEvent.press(view.getByTestId(SetupIds.ACTIVATE));

    // Activation deliberately waits for the gate's 2-second authoritative poll.
    await view.findByTestId(SetupIds.DONE);
    expect(posts(fixture)).toEqual([
      expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/activate'),
      }),
    ]);
    expect(invalidateQueries.mock.calls).toEqual(
      portfolioQueryFamilies(KALSHI_VENUE_ID).map((queryKey) => [{ queryKey }]),
    );
    const readsBeforeClose = gets(fixture).length;
    fireEvent.press(view.getByTestId(SetupIds.CLOSE));
    await view.findByTestId(HomeIds.IDENTITY_VERIFIED_BANNER);
    await flush();
    expectNoSetup(view);
    expect(gets(fixture)).toHaveLength(readsBeforeClose + 1);
    expect(posts(fixture)).toHaveLength(1);
  });

  it('opens cancelled setup with the Start again whole-card label', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'cancelled' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER);
    expect(
      view.getByRole('button', { name: actionLabel('cancelled') }),
    ).toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(HomeIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER),
    );

    await view.findByTestId(SetupIds.EMAIL_INPUT);
    expect(gets(fixture)).toHaveLength(2);
    expect(posts(fixture)).toHaveLength(0);
  });

  it('persists verified dismissal for the canonical profile across a remount', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'active' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.IDENTITY_VERIFIED_DISMISS);

    fireEvent.press(view.getByTestId(HomeIds.IDENTITY_VERIFIED_DISMISS));
    await waitFor(() =>
      expect(
        view.queryByTestId(HomeIds.IDENTITY_VERIFIED_BANNER),
      ).not.toBeOnTheScreen(),
    );
    expect(await StorageWrapper.getItem(preferenceKey)).toBe('true');
    view.unmount();
    const remounted = renderHome();
    await waitFor(() => expect(gets(fixture)).toHaveLength(2));
    await flush();

    expect(
      remounted.queryByTestId(HomeIds.IDENTITY_VERIFIED_BANNER),
    ).not.toBeOnTheScreen();
    expect(posts(fixture)).toHaveLength(0);
  });

  it('does not crash if persisting verified dismissal fails', async () => {
    configurePredictNextOnboarding({ status: { state: 'active' } });
    const view = renderHome();
    await view.findByTestId(HomeIds.IDENTITY_VERIFIED_DISMISS);
    // Inject a persistence rejection without replacing the dismissal hook.
    const setItem = jest
      .spyOn(StorageWrapper, 'setItem')
      .mockRejectedValueOnce(new Error('Disk full'));

    fireEvent.press(view.getByTestId(HomeIds.IDENTITY_VERIFIED_DISMISS));
    await flush();

    expect(setItem).toHaveBeenCalledWith(preferenceKey, 'true');
    expect(view.getByTestId(HomeIds.HOME)).toBeOnTheScreen();
    expectNoSetup(view);
  });

  it('renders readiness while an ordinary balance read is still pending', async () => {
    const fixture = configurePredictNextOnboarding();
    const defaultCall = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((action: string, ...params: unknown[]) =>
      action === 'PredictPortfolioService:getBalance'
        ? new Promise(() => undefined)
        : defaultCall?.(action, ...params),
    );
    const view = renderHome();

    await view.findByTestId(HomeIds.GET_STARTED_BANNER);

    expect(view.queryByTestId(HomeIds.BALANCE_AMOUNT)).not.toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(1);
    expect(posts(fixture)).toHaveLength(0);
  });

  it('renders readiness under an ordinary Balance error', async () => {
    const fixture = configurePredictNextOnboarding();
    const defaultCall = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((action: string, ...params: unknown[]) =>
      action === 'PredictPortfolioService:getBalance'
        ? Promise.reject(new Error('Balance failed'))
        : defaultCall?.(action, ...params),
    );
    const view = renderHome();

    await view.findByTestId(HomeIds.BALANCE_ERROR);

    expect(
      await view.findByTestId(HomeIds.GET_STARTED_BANNER),
    ).toBeOnTheScreen();
    expect(view.queryByTestId(HomeIds.BALANCE_AMOUNT)).not.toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(1);
    expect(posts(fixture)).toHaveLength(0);
  });

  it('orders Balance, readiness, Portfolio actions and the Feed state', async () => {
    configurePredictNextOnboarding();
    const view = renderHome();

    await view.findByTestId(HomeIds.GET_STARTED_BANNER);
    await view.findByTestId(HomeIds.HOME_TRENDING);

    const order = view
      .getAllByTestId(
        /^predict-next-home-(?:balance|account-readiness|portfolio-actions|positions|trending)$/,
      )
      .map((node) => String(node.props.testID));

    expect(order).toEqual([
      HomeIds.BALANCE,
      HomeIds.ACCOUNT_READINESS,
      HomeIds.ACTIONS,
      HomeIds.POSITIONS,
      HomeIds.HOME_TRENDING,
    ]);
  });

  it('hides readiness and read status under a region block', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'kyc_review' },
    });
    const defaultCall = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((action: string, ...params: unknown[]) =>
      action === 'PredictPortfolioService:getBalance'
        ? Promise.reject(PredictError.from(PredictErrorCode.GEO_BLOCKED))
        : defaultCall?.(action, ...params),
    );
    const view = renderHome();
    await view.findByTestId(HomeIds.BALANCE_GEO_BLOCKED);
    await flush();

    expect(view.queryByTestId(HomeIds.ACCOUNT_READINESS)).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(HomeIds.ACCOUNT_READINESS_READ_STATUS),
    ).not.toBeOnTheScreen();
    expect(posts(fixture)).toHaveLength(0);
    expectNoSetup(view);
  });

  it.each(['lock', 'sign out', 'replace profile'])(
    'tears down an in-flight observation on %s',
    async (change) => {
      const fixture = configurePredictNextOnboarding();
      const deferred = configurePredictNextOnboardingDeferred({
        onRequest: (request) => fixture.requests.push(request),
      });
      const view = renderHome();
      await waitFor(() => expect(gets(fixture)).toHaveLength(1));
      const state = view.store.getState().engine.backgroundState;
      const next =
        change === 'lock'
          ? {
              ...state,
              KeyringController: {
                ...state.KeyringController,
                isUnlocked: false,
              },
            }
          : {
              ...state,
              AuthenticationController: {
                ...state.AuthenticationController,
                ...(change === 'sign out'
                  ? { isSignedIn: false }
                  : {
                      srpSessionData: {
                        [PREDICT_NEXT_ENTROPY_SOURCE_ID]: {
                          profile: {
                            canonicalProfileId: 'replacement-profile',
                          },
                        },
                      },
                    }),
              },
            };
      if (change === 'replace profile') {
        fixture.setStatus({ state: 'none' });
      }

      await act(async () => {
        const key =
          change === 'lock' ? 'KeyringController' : 'AuthenticationController';
        engine.state = { ...engine.state, [key]: next[key] };
        view.store.dispatch(updateBgState({ key }));
        deferred.respond({ state: 'active' });
      });
      await flush();

      expect(
        view.queryByTestId(HomeIds.IDENTITY_VERIFIED_BANNER),
      ).not.toBeOnTheScreen();
      if (change === 'replace profile') {
        await view.findByTestId(HomeIds.GET_STARTED_BANNER);
        expect(gets(fixture)).toHaveLength(2);
      } else {
        expect(
          view.queryByTestId(HomeIds.ACCOUNT_READINESS),
        ).not.toBeOnTheScreen();
        expect(gets(fixture)).toHaveLength(1);
      }
      expect(posts(fixture)).toHaveLength(0);
      expectNoSetup(view);
    },
  );

  it('retains cached review offline without offering refresh or setup', async () => {
    const fixture = configurePredictNextOnboarding({
      status: { state: 'kyc_review' },
    });
    const view = renderHome();
    await view.findByTestId(HomeIds.VERIFICATION_PENDING_BANNER);
    nativeNetwork.__setMockNetInfo({
      type: 'none',
      isInternetReachable: false,
    });

    await act(async () => {
      appStateListeners.forEach((listener) => listener('background'));
    });
    await act(async () => {
      appStateListeners.forEach((listener) => listener('active'));
    });

    await view.findByText(strings('predict_next.account_readiness.offline'));
    expect(
      view.getByTestId(HomeIds.VERIFICATION_PENDING_BANNER),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(HomeIds.ACCOUNT_READINESS_REFRESH),
    ).not.toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(1);
    expect(posts(fixture)).toHaveLength(0);
    expectNoSetup(view);
  });

  it('does not read onboarding when Kalshi authentication is disabled', async () => {
    const fixture = configurePredictNextOnboarding();
    const view = renderHome({
      remoteFeatureFlags: {
        predictConfig: {
          enabled: true,
          venues: {
            polymarket: { enabled: false },
            kalshi: { enabled: false },
          },
          venueSelection: { enabled: false },
        },
      },
    });

    await view.findByTestId(HomeIds.HOME);
    await flush();

    expect(fixture.requests).toHaveLength(0);
    expect(view.queryByTestId(HomeIds.ACCOUNT_READINESS)).not.toBeOnTheScreen();
    expectNoSetup(view);
  });

  it(`dismisses setup through ${os === 'android' ? 'the native Android back request' : 'Not now'} with exactly one passive read`, async () => {
    const fixture = configurePredictNextOnboarding();
    const view = renderHome();
    await view.findByTestId(HomeIds.GET_STARTED_BANNER);
    fireEvent.press(view.getByTestId(HomeIds.GET_STARTED_BANNER));
    await view.findByTestId(SetupIds.NOT_NOW);
    const readsBeforeClose = gets(fixture).length;

    if (os === 'android') {
      // RN Modal consumes hardware back and delivers onRequestClose instead
      // of dispatching a JS BackHandler event while the modal is open.
      const modal = view
        .UNSAFE_getAllByType(Modal)
        .find((candidate) => within(candidate).queryByTestId(SetupIds.NOT_NOW));
      if (!modal) {
        throw new Error('Onboarding native modal was not mounted');
      }
      fireEvent(modal, 'requestClose');
    } else {
      fireEvent.press(view.getByTestId(SetupIds.NOT_NOW));
    }
    await waitFor(() =>
      expect(gets(fixture)).toHaveLength(readsBeforeClose + 1),
    );
    await flush();

    expectNoSetup(view);
    expect(view.getByTestId(HomeIds.GET_STARTED_BANNER)).toBeOnTheScreen();
    expect(gets(fixture)).toHaveLength(readsBeforeClose + 1);
    expect(posts(fixture)).toHaveLength(0);
  });
});
