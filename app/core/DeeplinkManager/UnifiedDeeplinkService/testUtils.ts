import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkParams } from './ActionRegistry';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';

/**
 * Common test utilities for deeplink tests
 */

export const createMockNavigation = () =>
  ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(),
    canGoBack: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getId: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>);

export const createDefaultParams = (
  overrides: Partial<DeeplinkUrlParams> = {},
): DeeplinkUrlParams => ({
  pubkey: '',
  uri: '',
  redirect: '',
  v: '',
  sdkVersion: '',
  rpc: '',
  originatorInfo: '',
  channelId: '',
  comm: '',
  attributionId: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
  hr: false,
  ...overrides,
});

export const createDeeplinkParams = (
  overrides: Partial<DeeplinkParams> = {},
): DeeplinkParams => ({
  action: 'test-action',
  path: '',
  params: createDefaultParams(),
  originalUrl: 'metamask://test',
  scheme: 'metamask:',
  navigation: createMockNavigation(),
  origin: 'deeplink',
  ...overrides,
});

/**
 * Helper to create test cases for navigation tests
 */
export interface NavigationTestCase {
  name: string;
  params: Partial<DeeplinkParams>;
  expectedView: string;
  expectedParams?: Record<string, unknown>;
}

/**
 * Helper to run navigation tests
 */
export const runNavigationTest = async (
  handler: (params: DeeplinkParams) => Promise<void>,
  testCase: NavigationTestCase,
) => {
  const params = createDeeplinkParams(testCase.params);
  await handler(params);

  const mockNavigation = params.navigation as jest.Mocked<
    NavigationProp<ParamListBase>
  >;
  expect(mockNavigation.navigate).toHaveBeenCalledWith(
    testCase.expectedView,
    testCase.expectedParams,
  );
};

/**
 * Helper to create parameterized action tests
 */
export const createActionTests = (
  createAction: () => { handler: (params: DeeplinkParams) => Promise<void> },
  testCases: NavigationTestCase[],
) =>
  describe.each(testCases)('$name', (testCase) => {
    it(`navigates to ${testCase.expectedView}`, async () => {
      const action = createAction();
      await runNavigationTest(action.handler, testCase);
    });
  });

/**
 * Common mock setup for handlers
 */
export const setupHandlerMocks = () => {
  const mocks = {
    DevLogger: {
      log: jest.fn(),
    },
    handleCreateAccountUrl: jest.fn(),
    handleRewardsUrl: jest.fn(),
  };

  return mocks;
};
