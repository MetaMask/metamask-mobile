/**
 * Shared jest mock factories for the MiCA KYC form screens.
 *
 * `jest.mock` factories are hoisted and run when the screen is first imported,
 * before the test file's `const mock… = jest.fn()` declarations are
 * initialised. These helpers therefore take callbacks that read the test
 * file's mocks lazily, e.g.:
 *
 * `jest.mock('./MicaKycFormLayout', () => require('../../testUtils/micaKycMocks').mockMicaKycFormLayout((props) => mockLayoutProps(props)))`
 */

interface MicaOption {
  name: string;
  value: string;
}

interface TransakRoutingMocks {
  onConfig: (config: unknown) => void;
  routeAfterAuthentication: (...args: unknown[]) => unknown;
}

/**
 * Module shape for `./MicaKycFormLayout` that renders the real layout but
 * reports its props, so tests can invoke the submit handler directly (the
 * disabled footer button never fires it).
 */
export function mockMicaKycFormLayout(
  onRender: (props: Record<string, unknown>) => void,
) {
  const { createElement } = jest.requireActual('react');
  const actual = jest.requireActual('../Views/NativeFlow/MicaKycFormLayout');
  return {
    __esModule: true,
    ...actual,
    default: (props: Record<string, unknown>): unknown => {
      onRender(props);
      return createElement(actual.default, props);
    },
  };
}

/**
 * Module shape for `hooks/useTransakRouting` that records the routing config
 * and returns the test's `routeAfterAuthentication` mock.
 */
export function mockTransakRoutingModule(getMocks: () => TransakRoutingMocks) {
  return {
    useTransakRouting: (config: unknown) => {
      const { onConfig, routeAfterAuthentication } = getMocks();
      onConfig(config);
      return { routeAfterAuthentication };
    },
  };
}

/**
 * Module shape for `util/navigation/navUtils` that serves the test's route
 * params and forwards navigation details to `navigation.navigate`.
 */
export function mockNavUtilsModule(getParams: () => unknown) {
  return {
    createNavigationDetails:
      (..._args: unknown[]) =>
      (params: unknown) => ['MockRoute', params],
    useParams: () => getParams(),
    navigateWithDetails: (
      navigation: { navigate: (...args: unknown[]) => void },
      details: unknown[],
    ) => navigation.navigate(...details),
    resetWithRoutes: (
      navigation: { reset: (state: unknown) => void },
      state: unknown,
    ) => navigation.reset(state),
  };
}

/**
 * Builds MiCA form metadata with the base Transak KYC fields left empty.
 */
export function buildMicaMetadata<TOverrides extends object>(
  overrides: TOverrides,
) {
  return {
    options: [] as MicaOption[],
    documentProofOptions: [] as MicaOption[],
    expiresAt: '',
    kycUrl: '',
    workFlowRunId: '',
    ...overrides,
  };
}
