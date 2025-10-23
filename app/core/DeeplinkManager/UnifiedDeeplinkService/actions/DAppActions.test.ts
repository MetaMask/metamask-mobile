import {
  createDappAction,
  createPerpsAction,
  registerDAppActions,
} from './DAppActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import handleBrowserUrl from '../../Handlers/handleBrowserUrl';
import { handlePerpsUrl } from '../../Handlers/handlePerpsUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';

// Mock dependencies
jest.mock('../../Handlers/handleBrowserUrl', () => jest.fn());
jest.mock('../../Handlers/handlePerpsUrl');
jest.mock('../../../SDKConnect/utils/DevLogger');

// Helper function to create default DeeplinkUrlParams
const createDefaultParams = (
  overrides?: Partial<DeeplinkUrlParams>,
): DeeplinkUrlParams => ({
  uri: '',
  redirect: '',
  channelId: '',
  comm: '',
  pubkey: '',
  hr: false,
  ...overrides,
});

describe('DAppActions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>;
  const mockBrowserCallBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDappAction', () => {
    it('creates dapp action with correct properties', () => {
      const action = createDappAction();

      expect(action.name).toBe(ACTIONS.DAPP);
      expect(action.supportedSchemes).toEqual(['dapp://', 'https://']);
      expect(action.description).toBe('Opens a dapp in the browser');
      expect(action.handler).toBeDefined();
    });

    it('handles dapp action with traditional deeplink URL', async () => {
      const action = createDappAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DAPP,
        path: '/https://uniswap.org',
        params: createDefaultParams(),
        originalUrl: 'metamask://dapp/https://uniswap.org',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DAppActions: Handling dapp action',
        {
          path: '/https://uniswap.org',
          originalUrl: 'metamask://dapp/https://uniswap.org',
        },
      );
      expect(handleBrowserUrl).toHaveBeenCalledWith({
        deeplinkManager: expect.any(Object),
        url: 'metamask://dapp/https://uniswap.org',
        callback: undefined,
      });
    });

    it('handles dapp action with dapp protocol URL', async () => {
      const action = createDappAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DAPP,
        path: '/example.com',
        params: createDefaultParams(),
        originalUrl: 'dapp://example.com',
        scheme: 'dapp:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(handleBrowserUrl).toHaveBeenCalledWith({
        deeplinkManager: expect.any(Object),
        url: 'dapp://example.com',
        callback: undefined,
      });
    });

    it('handles dapp action with browserCallBack', async () => {
      const action = createDappAction();
      const paramsWithCallback = createDefaultParams();
      // @ts-expect-error - browserCallBack is injected at runtime
      paramsWithCallback.browserCallBack = mockBrowserCallBack;

      const params: DeeplinkParams = {
        action: ACTIONS.DAPP,
        path: '/https://app.aave.com',
        params: paramsWithCallback,
        originalUrl: 'metamask://dapp/https://app.aave.com',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleBrowserUrl).toHaveBeenCalledWith({
        deeplinkManager: expect.any(Object),
        url: 'metamask://dapp/https://app.aave.com',
        callback: mockBrowserCallBack,
      });
    });

    it('handles dapp action with universal link', async () => {
      const action = createDappAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DAPP,
        path: '/example.com',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/dapp/example.com',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleBrowserUrl).toHaveBeenCalledWith({
        deeplinkManager: expect.any(Object),
        url: 'https://example.com',
        callback: undefined,
      });
    });

    it('handles dapp action without path', async () => {
      const action = createDappAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DAPP,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://dapp',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleBrowserUrl).toHaveBeenCalledWith({
        deeplinkManager: expect.any(Object),
        url: 'metamask://dapp',
        callback: undefined,
      });
    });
  });

  describe('createPerpsAction', () => {
    it('creates perps action with correct properties', () => {
      const action = createPerpsAction();

      expect(action.name).toBe(ACTIONS.PERPS);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the perps trading interface');
      expect(action.handler).toBeDefined();
    });

    it('handles perps action with path', async () => {
      const action = createPerpsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.PERPS,
        path: '/eth-usd',
        params: createDefaultParams(),
        originalUrl: 'metamask://perps/eth-usd',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DAppActions: Handling perps action',
        {
          path: '/eth-usd',
          queryParams: createDefaultParams(),
        },
      );
      expect(handlePerpsUrl).toHaveBeenCalledWith({
        perpsPath: '/eth-usd',
      });
    });

    it('handles perps action without path', async () => {
      const action = createPerpsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.PERPS,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/perps',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(handlePerpsUrl).toHaveBeenCalledWith({
        perpsPath: '',
      });
    });

    it('handles perps action with complex trading pair path', async () => {
      const action = createPerpsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.PERPS,
        path: '/markets/btc-usdt/long',
        params: createDefaultParams(),
        originalUrl: 'metamask://perps/markets/btc-usdt/long',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handlePerpsUrl).toHaveBeenCalledWith({
        perpsPath: '/markets/btc-usdt/long',
      });
    });
  });

  describe('registerDAppActions', () => {
    it('registers all dapp actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerDAppActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.DAPP }),
        expect.objectContaining({ name: ACTIONS.PERPS }),
        expect.objectContaining({ name: ACTIONS.PERPS_MARKETS }),
        expect.objectContaining({ name: ACTIONS.PERPS_ASSET }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerDAppActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock
        .calls[0][0];
      expect(registeredActions).toHaveLength(4);
    });

    it('registers actions in correct order', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerDAppActions(mockRegistry);

      const actions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(actions[0].name).toBe(ACTIONS.DAPP);
      expect(actions[1].name).toBe(ACTIONS.PERPS);
      expect(actions[2].name).toBe(ACTIONS.PERPS_MARKETS);
      expect(actions[3].name).toBe(ACTIONS.PERPS_ASSET);
    });
  });
});
