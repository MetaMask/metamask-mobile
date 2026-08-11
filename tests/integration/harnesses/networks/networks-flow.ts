/*
 * Networks FLOW integration-test harness — Shape B.
 *
 * Builds on Shape A (`./networks`) and lets tests render
 * `useNetworkOperations` so the chain runs:
 *
 *   renderHook(useNetworkOperations)
 *     → saveNetwork / removeNetwork
 *       → Engine.context.NetworkController / NetworkEnablementController /
 *         MultichainNetworkController  (real Shape A instances)
 *         + PreferencesController.setTokenNetworkFilter (stub)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - `useNetworkOperations` (rendered via renderHookWithProvider)
 *   - NetworkController / NetworkEnablementController / MultichainNetworkController
 *     from Shape A
 *
 * MOCKED (I/O + app-shell glue):
 *   - Shape A fetch / Slip44 / connectivity stubs
 *   - `app/core/Engine` context slots pointed at Shape A controllers
 *     (PreferencesController.setTokenNetworkFilter is a recording stub)
 *   - `@react-navigation/native` useNavigation (goBack / navigate)
 *   - `useAnalytics` (trackEvent / identify / createEventBuilder)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USAGE:
 *
 *     import { buildNetworksFlowHarness }
 *       from '../../../../../../tests/integration/harnesses/networks-flow';
 *     import { useNetworkOperations } from './useNetworkOperations';
 *
 *     const flow = buildNetworksFlowHarness();
 *     const { result } = flow.renderHookWithFlow(() => useNetworkOperations());
 *     await act(async () => { await result.current.saveNetwork(...); });
 */

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockIdentify = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(),
}));

jest.mock('../../../app/components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    identify: mockIdentify,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

import Engine from '../../../app/core/Engine';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import initialRootState from '../../../app/util/test/initial-root-state';
import type { RootState } from '../../../app/reducers';
import {
  buildNetworksIntegrationHarness,
  type NetworksIntegrationHarness,
  type NetworksIntegrationHarnessOptions,
} from './networks';

export interface NetworksFlowRenderOptions {
  stateOverrides?: DeepPartial<RootState>;
}

export interface NetworksFlowHarness {
  /** Underlying Shape A controllers + helpers. */
  controllers: NetworksIntegrationHarness;
  /**
   * Renders a hook with Redux state seeded from the live NetworkController
   * state (plus PreferencesController defaults needed by selectors).
   */
  renderHookWithFlow: <Result, Props>(
    hook: (props: Props) => Result,
    options?: NetworksFlowRenderOptions,
  ) => ReturnType<typeof renderHookWithProvider<Result, Props>>;
  /** Re-assign Engine.context to the current Shape A instances. */
  wireEngineContext: () => void;
  /** Build a Redux preloaded state snapshot from live controller state. */
  buildReduxState: (
    overrides?: DeepPartial<RootState>,
  ) => DeepPartial<RootState>;
  mocks: {
    navigate: jest.Mock;
    goBack: jest.Mock;
    setTokenNetworkFilter: jest.Mock;
    trackEvent: jest.Mock;
    identify: jest.Mock;
    fetch: jest.Mock;
    fetchNetworkActivity: jest.Mock;
  };
}

const mockSetTokenNetworkFilter = jest.fn();

function installEngineContext(controllers: NetworksIntegrationHarness) {
  Object.assign(Engine.context as Record<string, unknown>, {
    NetworkController: controllers.networkController,
    NetworkEnablementController: controllers.networkEnablementController,
    MultichainNetworkController: controllers.multichainNetworkController,
    PreferencesController: {
      ...(Engine.context.PreferencesController as object),
      setTokenNetworkFilter: mockSetTokenNetworkFilter,
    },
  });
}

export function buildNetworksFlowHarness(
  options: NetworksIntegrationHarnessOptions = {},
): NetworksFlowHarness {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockSetTokenNetworkFilter.mockClear();
  mockTrackEvent.mockClear();
  mockIdentify.mockClear();
  mockCreateEventBuilder.mockClear();

  const controllers = buildNetworksIntegrationHarness(options);

  const wireEngineContext = () => {
    installEngineContext(controllers);
  };
  wireEngineContext();

  const buildReduxState = (
    overrides: DeepPartial<RootState> = {},
  ): DeepPartial<RootState> => {
    const preferences =
      initialRootState.engine.backgroundState.PreferencesController;
    const overrideBackground = (
      overrides.engine as
        | { backgroundState?: Record<string, unknown> }
        | undefined
    )?.backgroundState;

    return {
      ...initialRootState,
      ...overrides,
      engine: {
        ...initialRootState.engine,
        ...(overrides.engine as object | undefined),
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          ...overrideBackground,
          NetworkController: {
            ...controllers.networkController.state,
            ...(overrideBackground?.NetworkController as object | undefined),
          },
          PreferencesController: {
            ...preferences,
            tokenNetworkFilter: {},
            ...(overrideBackground?.PreferencesController as
              | object
              | undefined),
          },
        },
      },
    };
  };

  const renderHookWithFlow = <Result, Props>(
    hook: (props: Props) => Result,
    renderOptions: NetworksFlowRenderOptions = {},
  ) =>
    renderHookWithProvider(hook, {
      state: buildReduxState(renderOptions.stateOverrides),
    });

  return {
    controllers,
    renderHookWithFlow,
    wireEngineContext,
    buildReduxState,
    mocks: {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setTokenNetworkFilter: mockSetTokenNetworkFilter,
      trackEvent: mockTrackEvent,
      identify: mockIdentify,
      fetch: controllers.mocks.fetch,
      fetchNetworkActivity: controllers.mocks.fetchNetworkActivity,
    },
  };
}
